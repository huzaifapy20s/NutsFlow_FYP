from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from app.models.base import db

migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()