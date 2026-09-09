from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_landlord
from app.db import get_db
from app.models import Landlord, Tenant
from app.schemas.tenant import TenantCreate, TenantRead, TenantUpdate

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant(
    payload: TenantCreate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Tenant:
    existing = db.query(Tenant).filter(Tenant.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tenant with this email already exists")

    tenant = Tenant(name=payload.name, email=payload.email, phone=payload.phone)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("", response_model=list[TenantRead])
def list_tenants(
    landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> list[Tenant]:
    return db.query(Tenant).all()


@router.get("/{tenant_id}", response_model=TenantRead)
def get_tenant(
    tenant_id: int, landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> Tenant:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    return tenant


@router.patch("/{tenant_id}", response_model=TenantRead)
def update_tenant(
    tenant_id: int,
    payload: TenantUpdate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Tenant:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    if payload.name is not None:
        tenant.name = payload.name
    if payload.email is not None:
        tenant.email = payload.email
    if payload.phone is not None:
        tenant.phone = payload.phone
    db.commit()
    db.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: int, landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> None:
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    db.delete(tenant)
    db.commit()
