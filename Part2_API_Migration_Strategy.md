# PART 2: Mock-to-Real API Transition Strategy

**Cheque Collection Feature Migration: Design & Productionization**

---

## ARCHITECTURE

**Data Flow Overview:**

```
[Frontend UI]
    |
    |---(REST API call or RPC)--->
[Supabase Backend]
    |       |           |
    |       |           |---> [Supabase storage bucket: Cheque images + OCR]
    |       |
    |       |---> [RLS-protected cheque_requests table (multi-role access)]
    |       |
    |       |---(serverless function/service)--->
    |                |
    |        [Bank Cheque Collection API]
    |                |
    |<-- Webhooks ---|
```

**Flow Description:**
1. **Landlords/Property Managers/Agents** use the UI to create and manage cheque collection requests.
2. Cheque images are uploaded to Supabase Storage (OCR processing triggers here, if needed).
3. Verified/approved requests are submitted via a secure edge function (or backend NestJS service) to the external bank API.
4. Status updates and collection results are received via secure inbound webhooks.

---

## SUPABASE SCHEMA

### Table: `cheque_requests`

| Column             | Type           | Constraints                    | Purpose                                   |
|--------------------|----------------|--------------------------------|-------------------------------------------|
| id                 | uuid           | pk, gen_random_uuid()          | Unique request ID                         |
| role               | text           | not null                       | Role of requester (LANDLORD/PM/AGENT)     |
| requester_user_id  | uuid           | fk profiles(user_id), not null | Who created the request                   |
| landlord_ids       | uuid[]         | array                          | IDs of involved landlords                 |
| property_ids       | uuid[]         | array                          | IDs of covered properties                 |
| items              | jsonb          | not null                       | Cheque items per Zod schema               |
| pickup_details     | jsonb          | not null                       | Contact & address details                 |
| status             | text           | indexed                        | e.g., DRAFT, SCHEDULED, FAILED...         |
| scheduled_at       | timestamptz    | nullable                       | Scheduled collection time                 |
| bank_ref           | text           | nullable, indexed              | External system reference                 |
| created_at         | timestamptz    | not null, default now()        |                                           |
| updated_at         | timestamptz    | not null, default now()        |                                           |

**Indexes:**
- status
- requester_user_id
- bank_ref (for quick reconciliation with the bank provider)

### RLS Policies

- `"Landlords/PMs/Agents can SELECT their requests"`
  - Policy: `requester_user_id = auth.uid() OR landlord_ids @> ARRAY[auth.uid()]`
- `"Only requester can INSERT"`
  - Policy: `requester_user_id = auth.uid()`
- `"Requester + PMs/Agents can UPDATE DRAFT or their managed requests"`
  - Policy: `requester_user_id = auth.uid() AND status IN ('DRAFT','FAILED')`
- `"Admins can UPDATE and SELECT all"`
  - Policy: `('ADMIN' = ANY(get_current_user_role()))`
- `"No DELETE except by Admin"`
  - Policy: `('ADMIN' = ANY(get_current_user_role()))`

---

### Storage Bucket: `cheque-images`

- **Bucket config:**  
  - Public read disabled, authenticated upload only.
  - RLS: `uploaded_by = auth.uid() OR ('ADMIN' = ANY(get_current_user_role()))`
  - Lifecycle rules: Secure automatic deletion for expired/cancelled requests.

---

## EXTERNAL API INTEGRATION

### Authentication

- Use per-environment encrypted `BANK_API_KEY`, never hard-coded.
- All outbound requests:  
  - `Authorization: Bearer <BANK_API_KEY>`
  - Add `X-Correlation-ID` header for traceability.

### Request Signing

- HMAC or public/private key signature for any payments/PII (verify with provider).
- Store request/response hashes in audit for traceability.

### Webhook Security

- Verify inbound webhook signatures.
- Restrict allowed origins, use secret “shared keys” or JWT verification.

### Error Handling

- Return precise HTTP errors to UI (e.g., validation, bank unavailable, retry hint).
- On any failure, log context with correlation ID to audit tables.
- Use retry queue (with exponential backoff) for external calls.
- Mark failed requests for user and ops dashboard with clear reasons.

### Idempotency and Retry Logic

- All submissions must use an idempotency key (typically, request UUID).
- Back-end should prevent duplicate cheque collection attempts.
- Use retry with exponential backoff for network failures, but never replay payments unless confirmed safe.

---

## MIGRATION PHASES

1. **Schema Creation**  
   - Define `cheque_requests` and storage buckets with strict RLS.
2. **Supabase Integration**  
   - Point UI to real `/rpc` or `/rest` endpoints to create/list/update requests.
   - Implement storage upload with signed URLs.
3. **Role Enforcement**  
   - Harden all CRUD to verify multi-role RLS on both storage and tables.
4. **Image & OCR Pipeline**  
   - Integrate frontend and storage uploads; trigger OCR via Supabase Edge Function.
5. **Bank API Stub Integration**  
   - Develop connector using `HttpChequeCollectionProvider` (inject credentials via Vault/environment).
   - Simulate full request submission to the banking API in sandbox/test mode.
6. **Webhook Listener**  
   - Deploy secure endpoint to receive and validate bank webhooks; update request statuses accordingly.
7. **Full E2E UAT**  
   - Conduct test cycles (with audit logging); fuzz for permission/race condition issues.
8. **Production Cutover**  
   - Switch DSN/API keys; restrict any fallback/mock logic in prod builds.
   - Monitor with real-time alerting for failures and suspicious access.

---

**This design hardens the cheque collection workflow from a mock system to full-production, auditable, and secure integration—ready for regulatory scrutiny and real-world scale.**

> *Prepared by Samir H. Senior Solution Architect.*
