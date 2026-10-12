from sqlalchemy import text

from app.db.database import Base, engine
from app.db import models  # Registers the models with Base


def initialize_database():
    with engine.begin() as connection:
        connection.execute(text("SELECT 1"))

    Base.metadata.create_all(bind=engine)
    print("RouteWise database connection successful.")
    print("Tables created or already present.")


if __name__ == "__main__":
    initialize_database()
