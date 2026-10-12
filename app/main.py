from fastapi import FastAPI

from app.api.routes import router as routes_router
from app.api.resources import router as resources_router

app = FastAPI(
    title="RouteWise API",
    description="Intelligent delivery route optimization platform",
    version="0.1.0",
)

app.include_router(routes_router)
app.include_router(resources_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "routewise-api",
        "version": "0.1.0",
    }
