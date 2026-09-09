from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_landlord, require_tenant
from app.auth.magic_link import generate_raw_token, hash_token, new_expiry
from app.auth.security import create_access_token, hash_password, verify_password
from app.config import settings
from app.db import get_db
from app.models import Landlord, MagicLink, Tenant
from app.ratelimit import rate_limit
from app.schemas.auth import (
    LandlordLoginRequest,
    LandlordMeResponse,
    LandlordSignupRequest,
    MagicLinkRequest,
    MagicLinkRequestResponse,
    MagicLinkVerifyRequest,
    TenantMeResponse,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/landlord/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
def signup_landlord(payload: LandlordSignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(Landlord).filter(Landlord.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    landlord = Landlord(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        phone=payload.phone,
    )
    db.add(landlord)
    db.commit()
    db.refresh(landlord)

    token = create_access_token(subject=str(landlord.id), role="landlord")
    return TokenResponse(access_token=token)


@router.post("/landlord/login", response_model=TokenResponse)
def login_landlord(payload: LandlordLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    landlord = db.query(Landlord).filter(Landlord.email == payload.email).first()
    if landlord is None or not verify_password(payload.password, landlord.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=str(landlord.id), role="landlord")
    return TokenResponse(access_token=token)


@router.get("/landlord/me", response_model=LandlordMeResponse)
def landlord_me(landlord: Landlord = Depends(require_landlord)) -> LandlordMeResponse:
    return LandlordMeResponse(id=landlord.id, email=landlord.email, name=landlord.name)


@router.post(
    "/tenant/magic-link/request",
    response_model=MagicLinkRequestResponse,
    dependencies=[Depends(rate_limit("magic_link_request", max_requests=5, window_seconds=900))],
)
def request_magic_link(
    payload: MagicLinkRequest, db: Session = Depends(get_db)
) -> MagicLinkRequestResponse:
    tenant = db.query(Tenant).filter(Tenant.email == payload.email).first()

    # Same response whether or not the email matches a tenant, so this
    # endpoint can't be used to enumerate registered tenant emails.
    if tenant is not None:
        raw_token = generate_raw_token()
        magic_link = MagicLink(
            tenant_id=tenant.id,
            token_hash=hash_token(raw_token),
            expires_at=new_expiry(settings.magic_link_expire_minutes),
        )
        db.add(magic_link)
        db.commit()

        # TODO(Epic J, Phase 2): email `raw_token` to the tenant via
        # Postmark/SendGrid instead of returning it directly — no email
        # provider is wired up in Phase 1. Gated to non-production so this
        # stub can never leak a real token in a deployed environment.
        if settings.environment != "production":
            return MagicLinkRequestResponse(message="Magic link generated", debug_token=raw_token)

    return MagicLinkRequestResponse(message="If that email is registered, a magic link was sent")


@router.post(
    "/tenant/magic-link/verify",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit("magic_link_verify", max_requests=10, window_seconds=900))],
)
def verify_magic_link(
    payload: MagicLinkVerifyRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    token_hash = hash_token(payload.token)
    magic_link = db.query(MagicLink).filter(MagicLink.token_hash == token_hash).first()

    if (
        magic_link is None
        or magic_link.used_at is not None
        or magic_link.expires_at < datetime.now(UTC)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired magic link"
        )

    magic_link.used_at = datetime.now(UTC)
    db.commit()

    token = create_access_token(subject=str(magic_link.tenant_id), role="tenant")
    return TokenResponse(access_token=token)


@router.get("/tenant/me", response_model=TenantMeResponse)
def tenant_me(tenant: Tenant = Depends(require_tenant)) -> TenantMeResponse:
    return TenantMeResponse(id=tenant.id, email=tenant.email, name=tenant.name)
