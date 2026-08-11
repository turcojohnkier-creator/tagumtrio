from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    str(settings.DATABASE_URL),
    future=True,
    # Render's managed Postgres silently drops idle connections after a
    # timeout. Without pre-ping, the pool hands out those dead connections,
    # they fail, and never get cleanly returned — the pool fills up with
    # unusable slots until every request (including login) times out
    # waiting 30s for a connection that never comes. pre_ping tests each
    # connection with a lightweight query before handing it out and
    # transparently reconnects if it's dead; pool_recycle proactively
    # replaces connections before they get old enough to be dropped.
    pool_pre_ping=True,
    pool_recycle=280,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
