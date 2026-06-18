# Implementation Plan — Step 5: Authentication, File Storage, and Land Deed Integration

## Status

- Decision: Approved for implementation after provider credentials are supplied
- Authentication: Supabase Auth
- File storage: Supabase Storage with private buckets
- Land deed integration: Provider-neutral asynchronous HTTP adapter
- Existing mock mode: Retained for local development and automated tests

## Objective

Replace the prototype's fixed-farmer and metadata-only upload behavior with secure authentication and real private file uploads. Replace the filename-based land deed mock boundary call with a typed HTTP contract that can submit an uploaded document to a real OCR/boundary provider.

Step 5 is complete only when:

1. API requests are authenticated and repository queries are scoped to the authenticated farmer.
2. Land deed and evidence files are uploaded to private Supabase Storage buckets.
3. The land deed adapter can call a configured HTTP provider using a short-lived signed document URL.
4. Mock mode and offline automated tests remain deterministic.
5. The full plot creation and boundary confirmation workflow passes in both mock and configured HTTP modes.

## Scope

### Included

- Supabase Auth integration in the React app and Express API
- Mapping a Supabase user to `FarmerProfile`
- Private Supabase Storage upload and download flows
- Upload metadata lifecycle in Postgres
- Provider-neutral land deed OCR/boundary HTTP contract
- Job submission, polling, result normalization, and failure handling
- Database migrations, validation, automated tests, and documentation

### Not Included

- Burn verification, carbon/token, or marketplace provider integrations
- Building a custom password or refresh-token system
- Public storage buckets for land deeds or evidence
- Provider-specific OCR field mappings until an actual provider is selected
- Production deployment or secret provisioning

## Architecture Decisions

### Authentication — Supabase Auth

Use Supabase Auth instead of Clerk or a custom JWT implementation.

Reasons:

- It can share one project and operational console with Supabase Storage.
- The frontend receives standard bearer access tokens.
- The Express API can verify tokens without storing passwords.
- It avoids implementing password hashing, refresh-token rotation, revocation, and account recovery.

Authentication modes:

- `AUTH_MODE=mock`: local development and existing deterministic tests only
- `AUTH_MODE=supabase`: required for hosted or production-like environments

The API must never silently fall back from Supabase authentication to mock authentication.

### File Storage — Private Supabase Storage

Use private buckets:

- `land-deeds`
- `evidence`
- `farm-records`

The browser uploads directly to Supabase using a short-lived signed upload URL issued by the Express API. The backend owns upload authorization and metadata creation.

Do not store public URLs. Store the bucket and object key, then issue short-lived signed download URLs only when required.

### Land Deed OCR/Boundary — Asynchronous HTTP Adapter

The integration must be provider-neutral. The application submits a short-lived signed document URL rather than a filename or a public URL.

Use separate adapter configuration instead of one global external API mode:

```env
LAND_DEED_ADAPTER_MODE=mock
LAND_DEED_API_URL=
LAND_DEED_API_KEY=
LAND_DEED_API_TIMEOUT_MS=15000
LAND_DEED_API_MAX_RETRIES=2
LAND_DEED_WEBHOOK_SECRET=
```

Supported modes:

- `mock`: deterministic local result
- `http`: call the configured provider

An HTTP failure in `http` mode must produce a visible integration error. It must not return mock data.

## Data Model Changes

### `FarmerProfile`

Add:

```prisma
authUserId String? @unique
```

Keep it nullable during migration so existing seed data remains valid. In Supabase mode, every authenticated request must resolve to a profile with a matching `authUserId`.

### `UploadedFile`

Add or refine:

```prisma
bucket          String?
storageKey      String?
sizeBytes       Int?
checksum        String?
uploadStatus    String   @default("pending")
uploadedAt      DateTime?
```

Allowed upload states:

- `pending`
- `uploaded`
- `failed`
- `deleted`

Keep `storageProvider`, setting it to `supabase` for real uploads and `prototype_metadata` only in mock mode.

### `LandDocument`

Add fields needed for asynchronous processing:

```prisma
provider             String?
providerStatus       String?
providerErrorCode    String?
providerErrorMessage String?
ocrResult            Json?
boundaryGeojson      Json?
submittedAt          DateTime?
completedAt          DateTime?
updatedAt            DateTime @updatedAt
```

Use normalized application statuses:

- `pending_upload`
- `queued`
- `processing`
- `succeeded`
- `needs_review`
- `failed`

Keep the raw provider payload for prototype diagnostics, but do not expose it directly to the frontend.

## Authentication Flow

### Frontend

1. Initialize the Supabase browser client using the public project URL and anon key.
2. Add a login/registration screen.
3. Use one configured sign-in method for Step 5. Default to phone OTP if the Supabase project supports Thai SMS delivery; otherwise use email/password for development.
4. Read the current session and attach the access token as:

   ```http
   Authorization: Bearer <access-token>
   ```

5. Handle expired sessions through the Supabase SDK refresh flow.
6. Clear authenticated application state on sign-out.

### Backend

1. Add authentication middleware that verifies the bearer token against Supabase.
2. Extract the stable Supabase user ID from the token `sub` claim.
3. Resolve `FarmerProfile.authUserId`.
4. Place the resolved identity in the request context.
5. Return:

   - `401` when the token is missing, expired, or invalid
   - `403` when the authenticated user attempts to access another farmer's resource
   - `404` when no farmer profile is linked and the route requires one

6. Replace the fixed `FARMER_ID` in the Prisma repository with an explicit authenticated farmer ID passed from the service layer.

### Profile Bootstrap

Add an authenticated endpoint:

```http
POST /api/v1/auth/profile
```

Behavior:

- If a profile already exists for the token subject, return it.
- Otherwise create a profile from validated registration data.
- Enforce one profile per `authUserId`.
- Make the operation idempotent.

## File Upload Contract

### 1. Create an upload intent

```http
POST /api/v1/uploads/intents
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "land-deed.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 2048000,
  "purpose": "land_deed"
}
```

Response:

```json
{
  "data": {
    "uploadId": "upload_123",
    "bucket": "land-deeds",
    "storageKey": "<farmerId>/land_deed/<uuid>.jpg",
    "signedUploadUrl": "<short-lived-url>",
    "expiresAt": "2026-06-18T12:00:00.000Z"
  }
}
```

### 2. Upload directly to storage

The frontend uploads the binary file to `signedUploadUrl`. The service-role key must remain on the server and must never be included in frontend code.

### 3. Complete the upload

```http
POST /api/v1/uploads/:uploadId/complete
Authorization: Bearer <token>
```

Before changing `uploadStatus` to `uploaded`, the API must verify that:

- The object exists.
- It is in the expected bucket and key.
- Its size and content type satisfy the upload intent.
- The upload belongs to the authenticated farmer.

### Upload Rules

- Land deed: JPEG, PNG, or PDF; maximum 15 MB
- Evidence/farm record: JPEG, PNG, or MP4; maximum size must be configurable
- Sanitize extensions and never use the original filename as the object key
- Reject SVG, HTML, and executable content
- Signed upload URLs should expire within 10 minutes
- Signed download URLs supplied to an OCR provider should use the shortest practical lifetime

## Land Deed Provider Contract

### Submit a job

The adapter sends:

```http
POST {LAND_DEED_API_URL}/v1/land-deed-jobs
Authorization: Bearer <LAND_DEED_API_KEY>
Idempotency-Key: <landDocumentId>
Content-Type: application/json

{
  "clientReferenceId": "<landDocumentId>",
  "documentType": "thai_land_title_deed",
  "documentUrl": "<short-lived-signed-download-url>",
  "requestedOperations": ["ocr", "boundary"],
  "outputCrs": "EPSG:4326",
  "callbackUrl": "<optional-webhook-url>"
}
```

Expected response:

```json
{
  "requestId": "provider_req_123",
  "status": "queued"
}
```

### Poll a job

```http
GET {LAND_DEED_API_URL}/v1/land-deed-jobs/{requestId}
Authorization: Bearer <LAND_DEED_API_KEY>
```

Expected normalized result:

```json
{
  "requestId": "provider_req_123",
  "status": "succeeded",
  "document": {
    "titleDeedNumber": "12345",
    "surveyPage": "6789",
    "parcelNumber": "12",
    "subdistrict": "ตัวอย่าง",
    "district": "ตัวอย่าง",
    "province": "ตัวอย่าง",
    "area": {
      "rai": 10,
      "ngan": 2,
      "squareWa": 20
    }
  },
  "boundary": {
    "type": "Polygon",
    "coordinates": []
  },
  "crs": "EPSG:4326",
  "confidence": {
    "overall": 0.94,
    "fields": {
      "titleDeedNumber": 0.98,
      "boundary": 0.91
    }
  },
  "warnings": []
}
```

The adapter must validate provider responses with Zod and convert provider-specific responses into this internal DTO.

### Error Contract

Normalize provider failures to:

```json
{
  "code": "DOCUMENT_UNREADABLE",
  "message": "The document could not be read.",
  "retryable": false,
  "providerRequestId": "provider_req_123"
}
```

Required error cases:

- `INVALID_DOCUMENT`
- `UNSUPPORTED_DOCUMENT_TYPE`
- `DOCUMENT_UNREADABLE`
- `BOUNDARY_NOT_FOUND`
- `RATE_LIMITED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_UNAVAILABLE`
- `INVALID_PROVIDER_RESPONSE`

Retry only network failures, `429`, and retryable `5xx` responses. Do not retry validation failures or unreadable documents. Use bounded exponential backoff and preserve the idempotency key.

## Application API Changes

Add:

```http
POST /api/v1/plots/:plotId/land-documents
POST /api/v1/land-documents/:id/process
GET  /api/v1/land-documents/:id/status
POST /api/v1/integrations/land-deed/webhook
```

Recommended workflow:

1. Authenticate the farmer.
2. Create and complete the private upload.
3. Create the plot and `LandDocument` using `uploadedFileId`.
4. Submit the land deed processing job.
5. Poll status from the frontend or receive a verified webhook.
6. Store normalized OCR fields and GeoJSON.
7. Show the extracted boundary for farmer confirmation.
8. Advance workflow to `boundary_confirmed` only after explicit confirmation.

The current plot endpoint may temporarily accept `documentFileName` in `mock` mode for compatibility, but Supabase/HTTP mode must require an uploaded file ID.

## Adapter Refactor

Split the current adapter implementation into:

```text
server/adapters/
  types.ts
  mockLandDeedAdapter.ts
  httpLandDeedAdapter.ts
  createExternalAdapters.ts
```

The adapter interface should expose:

```ts
interface LandDeedAdapter {
  submit(input: LandDeedSubmission): Promise<LandDeedJob>
  getResult(requestId: string): Promise<LandDeedResult>
}
```

Dependency-inject adapters into the Express app so tests do not require live network access.

## Configuration

Add to `.env.example`:

```env
AUTH_MODE=mock
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

STORAGE_MODE=mock
SUPABASE_LAND_DEEDS_BUCKET=land-deeds
SUPABASE_EVIDENCE_BUCKET=evidence
SUPABASE_FARM_RECORDS_BUCKET=farm-records
UPLOAD_URL_TTL_SECONDS=600
DOWNLOAD_URL_TTL_SECONDS=300

LAND_DEED_ADAPTER_MODE=mock
LAND_DEED_API_URL=
LAND_DEED_API_KEY=
LAND_DEED_API_TIMEOUT_MS=15000
LAND_DEED_API_MAX_RETRIES=2
LAND_DEED_WEBHOOK_SECRET=
```

Validate required environment variables at startup according to the selected modes. Fail startup with a clear error when a live mode is selected without its required configuration.

## Implementation Sequence

### Phase 1 — Contracts and migration

1. Add shared auth, upload, and land deed DTOs with Zod validation.
2. Update the Prisma schema.
3. Create a migration without deleting existing prototype data.
4. Update the idempotent seed.

### Phase 2 — Authentication

1. Add Supabase dependencies and environment validation.
2. Implement mock and Supabase auth middleware.
3. Implement profile bootstrap.
4. Remove fixed-farmer assumptions from services and repositories.
5. Add frontend session handling and login/registration UI.

### Phase 3 — Private storage

1. Create the storage adapter interface.
2. Implement mock and Supabase Storage adapters.
3. Add upload intent and completion endpoints.
4. Update frontend forms to upload files before domain submission.
5. Add signed download URL support for authorized previews and OCR submission.

### Phase 4 — Land deed HTTP adapter

1. Split mock and HTTP adapters.
2. Implement submission, polling, timeout, retry, and Zod response validation.
3. Add land document processing endpoints.
4. Persist provider IDs, normalized results, raw payloads, and errors.
5. Update the plot UI to show queued, processing, review, failed, and succeeded states.

### Phase 5 — Verification and documentation

1. Run all automated checks.
2. Test authenticated ownership boundaries with two farmer accounts.
3. Test real uploads to private buckets.
4. Test OCR HTTP mode against a local contract stub or provider sandbox.
5. Update README and `WEB_APP_BUILD_PLAN.md`.

## Automated Test Requirements

### Authentication

- Missing token returns `401`.
- Invalid or expired token returns `401`.
- Valid token resolves the correct farmer.
- A farmer cannot read or modify another farmer's plot, upload, or land document.
- Profile bootstrap is idempotent.
- Mock auth cannot activate implicitly in Supabase mode.

### Storage

- Invalid MIME type and oversized files are rejected.
- Object keys are generated from the authenticated farmer ID and a UUID.
- Upload completion verifies the object.
- A farmer cannot complete or request a signed URL for another farmer's upload.
- Service-role credentials are never returned to the client.

### Land Deed Adapter

- Mock mode remains deterministic.
- HTTP mode sends the required headers and body.
- Provider responses are normalized correctly.
- Invalid provider payloads fail with `INVALID_PROVIDER_RESPONSE`.
- Timeout, `429`, and `5xx` behavior follows retry rules.
- Idempotency key remains stable across retries.
- HTTP mode never silently returns mock data.

### Workflow

- Uploaded deed → processing → extracted boundary → farmer confirmation succeeds.
- Failed OCR does not advance workflow state.
- Boundary confirmation is impossible before a usable boundary or explicit manual-review path exists.

## Manual Verification

1. Create two Supabase test users and link two farmer profiles.
2. Confirm each user sees only their own resources.
3. Upload JPEG, PNG, and PDF land deed samples.
4. Confirm storage objects are private and inaccessible without a signed URL.
5. Submit a deed to a local HTTP stub or provider sandbox.
6. Observe processing status in the frontend.
7. Confirm the returned GeoJSON renders and can be explicitly accepted.
8. Confirm expired signed URLs no longer work.

Do not use `httpbin.org` as the contract test. Use a local stub server or the selected provider's sandbox so request and response schemas can both be verified.

## Commands

```bash
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
```

Also run the Postgres migration, idempotent seed, authenticated API smoke test, private upload smoke test, and mobile browser workflow.

## Definition of Done

Step 5 is approved as complete when:

- Supabase Auth is operational in the frontend and API.
- No production-like request depends on a fixed farmer ID.
- All farmer-owned database operations enforce ownership.
- Supabase Storage buckets are private.
- Real uploads use signed upload URLs and verified completion.
- Land deed HTTP mode submits a real uploaded document URL.
- OCR/boundary results use validated DTOs and GeoJSON in `EPSG:4326`.
- Provider errors are persisted and visible without silent mock fallback.
- Mock mode remains available only through explicit configuration.
- Tests, typecheck, lint, build, migration, seed, API smoke, and browser verification pass.

## Inputs Required Before Live Verification

- Supabase project URL
- Supabase anon key
- Supabase service-role key for backend-only use
- Confirmed login method: phone OTP or email/password
- Land deed provider base URL
- Land deed provider API key
- Provider request/response documentation or sandbox access
- Webhook signing specification, if the provider supports callbacks

Implementation may begin in mock/stub mode before these values are available. Step 5 cannot be declared live-integrated until Supabase and land deed provider sandbox checks pass.
