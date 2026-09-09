// Hand-written TS types mirroring the API's Pydantic schemas (apps/api/app/schemas/).
// Phase 1 keeps this manual rather than standing up an OpenAPI codegen
// pipeline for packages/shared-types — revisit if the two start drifting
// often enough to justify the generator.

export interface Property {
  id: number;
  name: string;
  address: string;
}

export interface Unit {
  id: number;
  property_id: number;
  unit_label: string;
  bedrooms: number | null;
  bathrooms: number | null;
}

export interface Tenant {
  id: number;
  unit_id: number | null;
  name: string;
  email: string;
  phone: string | null;
}

export type LeaseStatus = "active" | "ended";

export interface Lease {
  id: number;
  unit_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  status: LeaseStatus;
}

export interface LeaseDocument {
  id: number;
  lease_id: number;
  file_type: string;
  uploaded_at: string;
}

export interface LandlordMe {
  id: number;
  email: string;
  name: string;
}

export type SubmissionStatus = "open" | "in_progress" | "resolved";

export interface Submission {
  id: number;
  tenant_id: number;
  unit_id: number;
  description: string;
  photo_paths: string[];
  status: SubmissionStatus;
  classification: string | null;
  urgency: string | null;
  created_at: string;
  updated_at: string;
}
