import os
import re
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timezone, timedelta
import secrets
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from flask_migrate import Migrate
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
from flask import request
from sqlalchemy import func
from functools import wraps
from sqlalchemy.exc import IntegrityError
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
import smtplib
from email.message import EmailMessage
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.exceptions import HTTPException
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

load_dotenv()

# Refuse to start without a signing secret. There is deliberately no fallback value.
_JWT_SECRET = os.getenv("JWT_SECRET_KEY")
if not _JWT_SECRET:
    raise RuntimeError("JWT_SECRET_KEY is not set. Refusing to start without a signing secret.")
if len(_JWT_SECRET) < 32:
    print("WARNING: JWT_SECRET_KEY is shorter than 32 characters. Use a longer random value.")

app = Flask(__name__)
# Behind Render's proxy, read the real client IP and scheme. Without this every visitor shares one
# rate-limit bucket (the proxy's IP).
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

# Set ALLOWED_ORIGINS to your site address(es), comma separated, to lock CORS down.
# Left unset it stays open, which is safe for token-in-header auth but not tight.
_origins = [o.strip() for o in (os.getenv("ALLOWED_ORIGINS") or "").split(",") if o.strip()]
CORS(app, origins=_origins or "*")

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)
limiter = Limiter(get_remote_address, app=app, storage_uri="memory://")

serializer = URLSafeTimedSerializer(os.getenv("JWT_SECRET_KEY"))


def send_verification_email(user):
    token = serializer.dumps(user.email, salt="email-verify")
    base = os.getenv("BACKEND_URL", "http://127.0.0.1:5000")
    link = f"{base}/api/auth/verify/{token}"

    msg = EmailMessage()
    msg["Subject"] = "Verify your Club Hub account"
    msg["From"] = os.getenv("MAIL_USERNAME")
    msg["To"] = user.email
    msg.set_content(
        f"Hi {user.name},\n\n"
        f"Click this link to verify your email (valid for 24 hours):\n{link}\n"
    )

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(os.getenv("MAIL_USERNAME"), os.getenv("MAIL_PASSWORD"))
        server.send_message(msg)

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class Club(db.Model):
    __tablename__ = "clubs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    category = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    logo_url = db.Column(db.String(500))
    recruitment_open = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.CheckConstraint(
            "category IN ('technical', 'non_technical')",
            name="check_club_category",
        ),
    )


class ClubAdmin(db.Model):
    __tablename__ = "club_admins"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    club_id = db.Column(db.Integer, db.ForeignKey("clubs.id"), primary_key=True)

def parse_dt(value):
    if not value:
        return None
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        raise ValueError("Time must include a timezone offset, like +05:30")
    return dt

class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    club_id = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=False)
    statement = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default="pending")
    applied_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime(timezone=True))

    __table_args__ = (
        db.UniqueConstraint("user_id", "club_id", name="uq_application_user_club"),
        db.CheckConstraint(
            "status IN ('pending', 'accepted', 'rejected')",
            name="check_application_status",
        ),
    )


class Membership(db.Model):
    __tablename__ = "memberships"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    club_id = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=False)
    category = db.Column(db.String(20), nullable=False)
    joined_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.UniqueConstraint("user_id", "category", name="uq_membership_user_category"),
        db.CheckConstraint(
            "category IN ('technical', 'non_technical')",
            name="check_membership_category",
        ),
    )

class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    club_id = db.Column(db.Integer, db.ForeignKey("clubs.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    venue = db.Column(db.String(200))
    starts_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ends_at = db.Column(db.DateTime(timezone=True))
    capacity = db.Column(db.Integer, nullable=False)
    registration_deadline = db.Column(db.DateTime(timezone=True), nullable=False)
    is_removed = db.Column(db.Boolean, nullable=False, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.CheckConstraint("capacity > 0", name="check_event_capacity"),
    )


class EventRegistration(db.Model):
    __tablename__ = "event_registrations"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    registered_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.UniqueConstraint("event_id", "user_id", name="uq_registration_event_user"),
    )

def roles_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = db.session.get(User, int(get_jwt_identity()))
            if not user or not user.is_active:
                return jsonify({"error": "Account not available"}), 403
            if user.role not in allowed_roles:
                return jsonify({"error": "You do not have permission"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# ---------------------------------------------------------------- hardening helpers
MAX_NAME = 100
MAX_EMAIL = 255
MAX_PASSWORD = 72          # bcrypt only reads 72 bytes, and newer bcrypt raises on longer input
MAX_TITLE = 200
MAX_VENUE = 200
MAX_DESCRIPTION = 5000
MAX_STATEMENT = 3000
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PORTFOLIO_TAG = re.compile(r"^\[PORTFOLIO_URL:\s*([^\]]*)\]")
URL_RE = re.compile(r"^https?://[^\s\[\]<>\"']{1,500}$", re.IGNORECASE)


def random_password_hash():
    return bcrypt.generate_password_hash(secrets.token_urlsafe(32)).decode("utf-8")


@app.before_request
def require_json_object():
    """Every JSON body must be an object, so route code can safely call data.get(...)."""
    if request.method in ("POST", "PUT", "PATCH") and request.data:
        if request.get_json(silent=True) is None or not isinstance(request.get_json(silent=True), dict):
            return jsonify({"error": "Request body must be a JSON object"}), 400


@app.after_request
def security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if request.is_secure:
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.headers.get("Authorization"):
        resp.headers["Cache-Control"] = "no-store"
    return resp

def is_club_admin(user_id, club_id):
    return db.session.get(ClubAdmin, (user_id, club_id)) is not None

@app.route("/api/health")
def health():
    db.session.execute(db.text("SELECT 1"))
    return jsonify({"status": "ok", "database": "connected"})

@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if len(password) > MAX_PASSWORD:
        return jsonify({"error": f"Password must be at most {MAX_PASSWORD} characters"}), 400
    if len(name) > MAX_NAME or len(email) > MAX_EMAIL or not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid name and email address"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(name=name, email=email, password_hash=password_hash)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:  # two sign-ups with the same email at the same instant
        db.session.rollback()
        return jsonify({"error": "Email already registered"}), 409

    try:
        send_verification_email(user)
    except Exception as e:
        print("Email failed:", e)
        return jsonify({
            "message": "Account created, but the verification email could not be sent",
            "id": user.id,
        }), 201

    return jsonify({"message": "Account created. Check your email to verify.", "id": user.id}), 201

@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()

    if len(password) > MAX_PASSWORD or not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.is_active:
        return jsonify({"error": "This account has been disabled"}), 403
    if not user.is_verified:
        return jsonify({"error": "Please verify your email first"}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "role": user.role, "name": user.name})

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
ALLOWED_GOOGLE_DOMAIN = (os.getenv("ALLOWED_GOOGLE_DOMAIN") or "").strip().lower()


@app.route("/api/auth/google", methods=["POST"])
@limiter.limit("10 per minute")
def google_login():
    data = request.get_json() or {}
    credential = data.get("credential") or ""

    if not GOOGLE_CLIENT_ID:
        return jsonify({"error": "Google sign-in is not configured"}), 500

    try:
        info = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        return jsonify({"error": "Invalid Google sign-in"}), 401

    if not info.get("email_verified"):
        return jsonify({"error": "Your Google email is not verified"}), 401

    email = (info.get("email") or "").strip().lower()
    if ALLOWED_GOOGLE_DOMAIN and not email.endswith("@" + ALLOWED_GOOGLE_DOMAIN):
        return jsonify({"error": "Please use your college Google account"}), 403

    user = User.query.filter_by(email=email).first()
    try:
        if user is None:
            # Google users have no password. A random unusable hash satisfies the NOT NULL column.
            user = User(
                name=(info.get("name") or email.split("@")[0])[:100],
                email=email,
                password_hash=random_password_hash(),
                is_verified=True,
            )
            db.session.add(user)
            db.session.commit()
        elif not user.is_verified:
            # Google has proven they own this email. The unverified account may have been created by
            # someone else who typed this address, so throw away whatever password it had.
            user.is_verified = True
            user.password_hash = random_password_hash()
            db.session.commit()
    except IntegrityError:
        db.session.rollback()
        user = User.query.filter_by(email=email).first()

    if not user.is_active:
        return jsonify({"error": "This account has been disabled"}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "role": user.role, "name": user.name})

@app.route("/api/auth/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_active:
        return jsonify({"error": "Account not available"}), 403
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    })

@app.route("/api/auth/verify/<token>")
@limiter.limit("30 per minute")
def verify_email(token):
    try:
        email = serializer.loads(token, salt="email-verify", max_age=86400)
    except SignatureExpired:
        return jsonify({"error": "This link has expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid verification link"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.is_verified = True
    db.session.commit()
    return jsonify({"message": "Email verified. You can now log in."})

@app.route("/api/clubs", methods=["GET"])
def list_clubs():
    clubs = Club.query.order_by(Club.name).all()
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "category": c.category,
            "description": c.description,
            "recruitment_open": c.recruitment_open,
        }
        for c in clubs
    ])


@app.route("/api/clubs", methods=["POST"])
@roles_required("site_admin")
def create_club():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    category = data.get("category")
    description = (data.get("description") or "").strip()

    if not name or category not in ("technical", "non_technical"):
        return jsonify({"error": "Name and a valid category are required"}), 400
    if len(name) > MAX_NAME or len(description) > MAX_DESCRIPTION:
        return jsonify({"error": "Name or description is too long"}), 400
    if Club.query.filter_by(name=name).first():
        return jsonify({"error": "A club with this name already exists"}), 409

    club = Club(name=name, category=category, description=description)
    db.session.add(club)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "A club with this name already exists"}), 409
    return jsonify({"message": "Club created", "id": club.id}), 201

@app.route("/api/clubs/<int:club_id>/admins", methods=["POST"])
@roles_required("site_admin")
def add_club_admin(club_id):
    club = db.session.get(Club, club_id)
    if not club:
        return jsonify({"error": "Club not found"}), 404

    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "No user with that email"}), 404
    if not user.is_verified:
        return jsonify({"error": "That user has not verified their email"}), 400

    existing = db.session.get(ClubAdmin, (user.id, club.id))
    if existing:
        return jsonify({"error": "Already an admin of this club"}), 409

    if user.role == "student":
        user.role = "club_admin"
    db.session.add(ClubAdmin(user_id=user.id, club_id=club.id))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Already an admin of this club"}), 409
    return jsonify({"message": f"{user.name} is now an admin of {club.name}"}), 201

@app.route("/api/clubs/<int:club_id>/apply", methods=["POST"])
@roles_required("student", "club_admin")
def apply_to_club(club_id):
    user_id = int(get_jwt_identity())
    club = db.session.get(Club, club_id)
    if not club:
        return jsonify({"error": "Club not found"}), 404
    if not club.recruitment_open:
        return jsonify({"error": "Recruitment is closed for this club"}), 400
    if db.session.get(ClubAdmin, (user_id, club.id)):
        return jsonify({"error": "You manage this club"}), 400
    if Membership.query.filter_by(user_id=user_id, category=club.category).first():
        return jsonify({"error": "You are already a member of a club in this category"}), 409
    if Application.query.filter_by(user_id=user_id, club_id=club.id).first():
        return jsonify({"error": "You have already applied to this club"}), 409

    data = request.get_json() or {}
    statement = (data.get("statement") or "").strip()
    if len(statement) > MAX_STATEMENT:
        return jsonify({"error": "Statement is too long"}), 400
    tag = PORTFOLIO_TAG.match(statement)
    if tag and not URL_RE.match(tag.group(1).strip()):
        return jsonify({"error": "Portfolio link must start with http:// or https://"}), 400

    application = Application(user_id=user_id, club_id=club.id, statement=statement)
    db.session.add(application)
    try:
        db.session.commit()
    except IntegrityError:  # a double click, or two tabs, sending the same application together
        db.session.rollback()
        return jsonify({"error": "You have already applied to this club"}), 409
    return jsonify({"message": "Application submitted", "id": application.id}), 201

@app.route("/api/clubs/<int:club_id>/applications", methods=["GET"])
@roles_required("club_admin", "site_admin")
def list_applications(club_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user.role != "site_admin" and not is_club_admin(user_id, club_id):
        return jsonify({"error": "You do not manage this club"}), 403

    query = (
        db.session.query(Application, User)
        .join(User, Application.user_id == User.id)
        .filter(Application.club_id == club_id)
    )
    status = request.args.get("status")
    if status:
        query = query.filter(Application.status == status)

    rows = query.order_by(Application.applied_at).all()
    return jsonify([
        {
            "id": a.id,
            "name": u.name,
            "email": u.email,
            "statement": a.statement,
            "status": a.status,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        }
        for a, u in rows
    ])


@app.route("/api/applications/<int:application_id>/review", methods=["POST"])
@roles_required("club_admin", "site_admin")
def review_application(application_id):
    reviewer_id = int(get_jwt_identity())
    reviewer = db.session.get(User, reviewer_id)
    application = (
        db.session.query(Application)
        .filter_by(id=application_id)
        .with_for_update()
        .first()
    )
    if not application:
        return jsonify({"error": "Application not found"}), 404
    if reviewer.role != "site_admin" and not is_club_admin(reviewer_id, application.club_id):
        return jsonify({"error": "You do not manage this club"}), 403
    if application.status != "pending":
        return jsonify({"error": "This application was already reviewed"}), 409

    data = request.get_json() or {}
    decision = (data.get("decision") or "").lower()
    if decision not in ("accepted", "rejected"):
        return jsonify({"error": "Decision must be accepted or rejected"}), 400

    if decision == "accepted":
        club = db.session.get(Club, application.club_id)
        if Membership.query.filter_by(user_id=application.user_id, category=club.category).first():
            return jsonify({"error": "The applicant is already in a club of this category"}), 409
        db.session.add(Membership(
            user_id=application.user_id,
            club_id=club.id,
            category=club.category,
        ))

    application.status = decision
    application.reviewed_by = reviewer_id
    application.reviewed_at = datetime.now(timezone.utc)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Could not save, a conflict occurred"}), 409

    return jsonify({"message": f"Application {decision}"})

@app.route("/api/clubs/<int:club_id>/events", methods=["POST"])
@roles_required("club_admin", "site_admin")
def create_event(club_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    club = db.session.get(Club, club_id)
    if not club:
        return jsonify({"error": "Club not found"}), 404
    if user.role != "site_admin" and not is_club_admin(user_id, club_id):
        return jsonify({"error": "You do not manage this club"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    try:
        starts_at = parse_dt(data.get("starts_at"))
        ends_at = parse_dt(data.get("ends_at"))
        deadline = parse_dt(data.get("registration_deadline"))
        capacity = int(data.get("capacity"))
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid input: {e}"}), 400

    if not title or not starts_at or not deadline:
        return jsonify({"error": "Title, start time and registration deadline are required"}), 400
    if (
        len(title) > MAX_TITLE
        or len((data.get("venue") or "")) > MAX_VENUE
        or len((data.get("description") or "")) > MAX_DESCRIPTION
    ):
        return jsonify({"error": "Title, venue or description is too long"}), 400
    if capacity < 1:
        return jsonify({"error": "Capacity must be at least 1"}), 400
    if starts_at <= datetime.now(timezone.utc):
        return jsonify({"error": "Start time must be in the future"}), 400
    if deadline > starts_at:
        return jsonify({"error": "Registration deadline must be before the start time"}), 400
    if ends_at and ends_at <= starts_at:
        return jsonify({"error": "End time must be after the start time"}), 400

    event = Event(
        club_id=club.id,
        title=title,
        description=(data.get("description") or "").strip(),
        venue=(data.get("venue") or "").strip(),
        starts_at=starts_at,
        ends_at=ends_at,
        capacity=capacity,
        registration_deadline=deadline,
        created_by=user_id,
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({"message": "Event created", "id": event.id}), 201


@app.route("/api/events", methods=["GET"])
def list_events():
    query = Event.query.filter_by(is_removed=False)
    club_id = request.args.get("club_id", type=int)
    if club_id:
        query = query.filter_by(club_id=club_id)
    events = query.order_by(Event.starts_at).all()

    counts = dict(
        db.session.query(EventRegistration.event_id, func.count())
        .group_by(EventRegistration.event_id)
        .all()
    )
    return jsonify([
        {
            "id": e.id,
            "club_id": e.club_id,
            "title": e.title,
            "description": e.description,
            "venue": e.venue,
            "starts_at": e.starts_at.isoformat(),
            "registration_deadline": e.registration_deadline.isoformat(),
            "capacity": e.capacity,
            "registered": counts.get(e.id, 0),
        }
        for e in events
    ])

@app.route("/api/events/<int:event_id>/register", methods=["POST"])
@roles_required("student", "club_admin", "site_admin")
def register_for_event(event_id):
    user_id = int(get_jwt_identity())

    event = (
        db.session.query(Event)
        .filter_by(id=event_id, is_removed=False)
        .with_for_update()
        .first()
    )
    if not event:
        return jsonify({"error": "Event not found"}), 404
    if datetime.now(timezone.utc) > event.registration_deadline:
        return jsonify({"error": "Registration has closed for this event"}), 400
    if EventRegistration.query.filter_by(event_id=event.id, user_id=user_id).first():
        return jsonify({"error": "You are already registered"}), 409

    taken = EventRegistration.query.filter_by(event_id=event.id).count()
    if taken >= event.capacity:
        return jsonify({"error": "This event is full"}), 409

    db.session.add(EventRegistration(event_id=event.id, user_id=user_id))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Could not register, please try again"}), 409

    return jsonify({"message": "You are registered", "seats_left": event.capacity - taken - 1}), 201

@app.route("/api/clubs/<int:club_id>/recruitment", methods=["POST"])
@roles_required("club_admin", "site_admin")
def set_recruitment(club_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    club = db.session.get(Club, club_id)
    if not club:
        return jsonify({"error": "Club not found"}), 404
    if user.role != "site_admin" and not is_club_admin(user_id, club_id):
        return jsonify({"error": "You do not manage this club"}), 403

    data = request.get_json() or {}
    if not isinstance(data.get("open"), bool):
        return jsonify({"error": "'open' must be true or false"}), 400

    club.recruitment_open = data["open"]
    db.session.commit()
    return jsonify({"message": "Recruitment updated", "recruitment_open": club.recruitment_open})


@app.route("/api/me/overview", methods=["GET"])
@jwt_required()
def my_overview():
    user_id = int(get_jwt_identity())
    me_user = db.session.get(User, user_id)
    if not me_user or not me_user.is_active:
        return jsonify({"error": "Account not available"}), 403

    applications = (
        db.session.query(Application, Club)
        .join(Club, Application.club_id == Club.id)
        .filter(Application.user_id == user_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    memberships = (
        db.session.query(Membership, Club)
        .join(Club, Membership.club_id == Club.id)
        .filter(Membership.user_id == user_id)
        .all()
    )
    registrations = (
        db.session.query(EventRegistration, Event)
        .join(Event, EventRegistration.event_id == Event.id)
        .filter(EventRegistration.user_id == user_id, Event.is_removed == False)
        .order_by(Event.starts_at)
        .all()
    )

    return jsonify({
        "applications": [
            {"club": c.name, "status": a.status, "applied_at": a.applied_at.isoformat()}
            for a, c in applications
        ],
        "memberships": [
            {"club": c.name, "category": m.category, "joined_at": m.joined_at.isoformat()}
            for m, c in memberships
        ],
        "events": [
            {"title": e.title, "starts_at": e.starts_at.isoformat(), "venue": e.venue}
            for r, e in registrations
        ],
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(429)
def too_many_requests(e):
    return jsonify({"error": "Too many requests, please slow down"}), 429


@app.errorhandler(500)
def server_error(e):
    db.session.rollback()
    return jsonify({"error": "Something went wrong on our side"}), 500


@app.errorhandler(Exception)
def unhandled(e):
    """Last resort. Log the real error on the server, return a generic message to the client."""
    if isinstance(e, HTTPException):
        return jsonify({"error": e.name}), e.code
    db.session.rollback()
    app.logger.exception("Unhandled error")
    return jsonify({"error": "Something went wrong on our side"}), 500

@app.route("/api/events/<int:event_id>/attendees", methods=["GET"])
@roles_required("club_admin", "site_admin")
def event_attendees(event_id):
    user = db.session.get(User, int(get_jwt_identity()))
    event = db.session.get(Event, event_id)
    if not event or event.is_removed:
        return jsonify({"error": "Event not found"}), 404
    if user.role != "site_admin" and not is_club_admin(user.id, event.club_id):
        return jsonify({"error": "You do not manage this club"}), 403

    club = db.session.get(Club, event.club_id)
    rows = (
        db.session.query(EventRegistration, User)
        .join(User, User.id == EventRegistration.user_id)
        .filter(EventRegistration.event_id == event_id)
        .order_by(EventRegistration.registered_at, EventRegistration.id)
        .all()
    )
    return jsonify({
        "event": {
            "id": event.id,
            "title": event.title,
            "venue": event.venue,
            "event_date": event.starts_at.isoformat(),
            "capacity": event.capacity,
            "registered_count": len(rows),
            "club_name": club.name if club else "",
        },
        "attendees": [
            {
                "user_id": u.id,
                "name": u.name,
                "email": u.email,
                "registered_at": r.registered_at.isoformat() if r.registered_at else None,
            }
            for r, u in rows
        ],
    })

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG") == "1")