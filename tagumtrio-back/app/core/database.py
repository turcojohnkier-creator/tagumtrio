# Re-export the single get_db from app.db. FastAPI only shares a dependency
# within a request when it is the *same* function object, so a second get_db
# here made every authenticated request open two sessions (one for
# get_current_user, one for the endpoint) and hold two pool connections.
# Under a burst of requests each one held a connection while waiting for its
# second, deadlocking the pool until everything (including login) timed out.
from app.db import SessionLocal, get_db

__all__ = ["SessionLocal", "get_db"]
