from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.activity import router as activity_router
from app.routers.auth import router as auth_router
from app.routers.inbox import router as inbox_router
from app.routers.lease_documents import router as lease_documents_router
from app.routers.leases import router as leases_router
from app.routers.properties import router as properties_router
from app.routers.property_photos import router as property_photos_router
from app.routers.submissions import router as submissions_router
from app.routers.tenants import router as tenants_router
from app.routers.units import router as units_router

app = FastAPI(title="AI Property Manager API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(properties_router)
app.include_router(property_photos_router)
app.include_router(units_router)
app.include_router(tenants_router)
app.include_router(leases_router)
app.include_router(lease_documents_router)
app.include_router(submissions_router)
app.include_router(inbox_router)
app.include_router(activity_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
