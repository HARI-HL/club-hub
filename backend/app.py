import os
from datetime import datetime, timezone
from flask_migrate import Migrate
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
from flask import request
from functools import wraps
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
import smtplib
from email.message import EmailMessage
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)

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


@app.route("/api/health")
def health():
    db.session.execute(db.text("SELECT 1"))
    return jsonify({"status": "ok", "database": "connected"})

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(name=name, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

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
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.is_active:
        return jsonify({"error": "This account has been disabled"}), 403
    if not user.is_verified:
        return jsonify({"error": "Please verify your email first"}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "role": user.role, "name": user.name})


@app.route("/api/auth/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    })

@app.route("/api/auth/verify/<token>")
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
    if Club.query.filter_by(name=name).first():
        return jsonify({"error": "A club with this name already exists"}), 409

    club = Club(name=name, category=category, description=description)
    db.session.add(club)
    db.session.commit()
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
    db.session.commit()
    return jsonify({"message": f"{user.name} is now an admin of {club.name}"}), 201

if __name__ == "__main__":
    app.run(debug=True)