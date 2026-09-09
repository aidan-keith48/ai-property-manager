from pydantic import BaseModel, EmailStr, Field


class LandlordSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    phone: str | None = None


class LandlordLoginRequest(BaseModel):
    email: EmailStr
    password: str


class LandlordMeResponse(BaseModel):
    id: int
    email: str
    name: str


class TenantMeResponse(BaseModel):
    id: int
    email: str
    name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkRequestResponse(BaseModel):
    message: str
    # Populated only outside production, so local/dev/test flows work without
    # a real email provider wired up yet (Epic J, Phase 2). See
    # app/routers/auth.py.
    debug_token: str | None = None


class MagicLinkVerifyRequest(BaseModel):
    token: str
