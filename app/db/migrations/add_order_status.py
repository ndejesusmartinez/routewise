from sqlalchemy import text

from app.db.database import engine


def migrate():
    with engine.begin() as connection:
        connection.execute(
            text("""
                ALTER TABLE orders
                ADD COLUMN IF NOT EXISTS status VARCHAR(20)
            """)
        )

        connection.execute(
            text("""
                UPDATE orders
                SET status = 'PENDING'
                WHERE status IS NULL
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE orders
                ALTER COLUMN status SET DEFAULT 'PENDING'
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE orders
                ALTER COLUMN status SET NOT NULL
            """)
        )

    print("Order status migration completed.")


if __name__ == "__main__":
    migrate()