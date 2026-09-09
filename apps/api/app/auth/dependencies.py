import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db import get_db
from app.models import Landlord, Tenant

_bearer_scheme = HTTPBearer()


def get_current_principal(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    try:
        return decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from exc


def require_landlord(
    principal: dict = Depends(get_current_principal), db: Session = Depends(get_db)
) -> Landlord:
    if principal.get("role") != "landlord":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Landlord access required"
        )
    landlord = db.get(Landlord, int(principal["sub"]))
    if landlord is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Landlord not found")
    return landlord


def require_tenant(
    principal: dict = Depends(get_current_principal), db: Session = Depends(get_db)
) -> Tenant:
    if principal.get("role") != "tenant":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant access required")
    tenant = db.get(Tenant, int(principal["sub"]))
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tenant not found")
    return tenant


# Contractor role is defined in the JWT role vocabulary (see
# app/auth/security.py callers) but has no require_contractor() dependency or
# UI yet — Epic E is Phase 2. See docs/engineering-plan.md §1.
