from sqlalchemy import text

from app.db.database import engine


def migrate():
    with engine.begin() as connection:
        connection.execute(
            text("""
                ALTER TABLE delivery_plan_routes
                ADD COLUMN IF NOT EXISTS route_geometry JSON
            """)
        )

    print("Route geometry migration completed.")


if __name__ == "__main__":
    migrate()
