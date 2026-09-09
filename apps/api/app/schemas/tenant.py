from pydantic import BaseModel, ConfigDict, EmailStr


class TenantCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None


class TenantUpdate(BaseModel):
    # Deliberately excludes unit_id — it is never directly editable. It is
    # only ever written as a side effect of the lease create/end code path
    # (app/crud/lease.py). See app/models/tenant.py and
    # docs/engineering-plan.md §6.
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


class TenantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_id: int | None
    name: str
    email: str
    phone: str | None
