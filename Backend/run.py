##from app import create_app

##app = create_app()

##if __name__ == "__main__":
    ##app.run()

from app import create_app
import os

app = create_app()

print("DATABASE_URL FROM ENV:", os.getenv("DATABASE_URL"))
print("SQLALCHEMY_DATABASE_URI:", app.config.get("SQLALCHEMY_DATABASE_URI"))

if __name__ == "__main__":
    app.run()