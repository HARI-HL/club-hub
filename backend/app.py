import os
from datetime import datetime, timezone
from flask_migrate import Migrate
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)


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


@app.route("/api/health")
def health():
    db.session.execute(db.text("SELECT 1"))
    return jsonify({"status": "ok", "database": "connected"})


if __name__ == "__main__":
    app.run(debug=True)