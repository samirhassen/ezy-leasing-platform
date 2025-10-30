# EZY RNPL Code Review  
**Part 1: Security Vulnerability Assessment**  
*Date: 30-10-2025 | Reviewer: Samir Hassen*

## Scope

**Files Reviewed:**
- `src/stores/auth.ts` (Zustand auth store)
- `src/components/auth/RouteGuard.tsx` (Route protection logic)
- `src/types/auth.ts` (User/session/types & mock data)
- `database-schema.md` (Supabase schema and RLS policies)

**Review Goals:**
- Identify authentication and authorization vulnerabilities
- Assess Row-Level Security (RLS) and role-based access control (RBAC)
- Highlight session management, privilege escalation, and audit logging risks
- Recommend actionable, production-grade remediation steps

---

## CRITICAL (Production Blockers)

| Vulnerability                                              | Location                               | Risk / Attack Scenario                                                                        | Remediation                                                                                                                      |
|-----------------------------------------------------------|----------------------------------------|-----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| **DEV-Only Impersonation/BYPASS Leaks to Production**     | `src/stores/auth.ts` (lines 228–265)   | If environment variables (`DEV` or `VITE_AUTH_DISABLED`) are set incorrectly in prod, anyone could assume any user/role—compromising all account data and control. | Enforce dead code for all impersonation/bypass in production. Add run-time checks for hostname, enforce CI/CD deployment guards, and log all override attempts.  |
| **Authentication Bypass env flag (`VITE_AUTH_DISABLED`)** | `RouteGuard.tsx` (lines 24–27) and `auth.ts` | Setting this flag disables all auth checks, potentially granting public access to privileged areas and actions. | Remove or production-gate this flag. Abort app start or show a blocking warning if it’s set in any deployed environment.         |
| **Over-Permissive Audit Logging (`true` RLS policy)**     | `database-schema.md` (audit_events, lines 53–55) | Anyone (even unauthenticated) can spam/poison audit logs, hiding or covering real malicious/privileged activity. | Restrict insert policy to `auth.uid() IS NOT NULL`. Log actor, IP, and add validation/rate-limiting for critical events.            |

---

## HIGH (Must Fix Before Launch)

| Vulnerability                                             | Location                        | Risk / Attack Scenario                                                  | Remediation                                                                                                                                            |
|----------------------------------------------------------|---------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Hardcoded, Weak Mock Credentials**                     | `src/types/auth.ts` (25–81)     | If left in production or public, attackers could gain control using known logins.                              | Remove all mock credentials/functions from production builds. Use per-environment test secrets, never hardcoded or source-controlled.                  |
| **First-Role-Only Privilege Assignment**                 | `auth.ts`/`RouteGuard.tsx`      | If user’s role array is unordered/manipulable, privilege confusion/escalation is possible.                    | Always check against the *full* role array for all RBAC decisions, never the first item only. Refactor guards/checks for multi-role.                   |
| **Unprotected Session Storage for “Impersonation”**      | `auth.ts` (lines 39–41, 301–335)| Session data for impersonated (DEV) users is stored in `sessionStorage`, easily injectable and reusable across browsers. | Invalidate impersonated sessions on env/origin change; sign or encrypt session data; strictly forbid import/export across environments.                 |

---

## MEDIUM (Should Fix)

| Vulnerability                                         | Location                    | Risk / Attack Scenario                                                      | Remediation                                                           |
|------------------------------------------------------|-----------------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **Incomplete Audit Logging for Privilege Escalation** | `auth.ts`, `database-schema.md` | Not all power actions, failed or successful, are comprehensively logged.    | Extend audit logging to all elevation and impersonation, include full actor/target/IP metadata.|
| **Role Guard Supports Only Single Role**              | `RouteGuard.tsx` (lines 41–43) | Users with multiple roles could be denied rightful access or gain unintended access.         | Refactor guard to accept any matching role in a user’s roles array.    |
| **No Rate Limiting/Brute-Force Defense in Auth Flows**| Backend/edge logic           | Unchecked login/sign-up attempts expose users to automated password guessing. | Confirm/implement backend (Supabase) rate limiting, add FE warnings and MFA when possible.   |
| **No Client-Side PII Masking or Field Encryption**    | `auth.ts`, `database-schema.md` | Exposure of emiratesId, phone, etc. without masking or encryption.          | Mask/redact PII on client and logs, enforce TLS on all communications. |
| **No FE Session Timeout/Expiry**                     | `src/stores/auth.ts`         | Stale sessions (esp. impersonation/dev) can be hijacked via XSS or remaining browsers.        | Enforce inactivity and absolute expiry timeouts; match Supabase session policies.   |

---

## Executive Recommendations

**Immediate Priority:**  
1. Remove all DEV-only and authentication bypass code paths in production.  
2. Reinforce and expand RLS for all tables, especially audit and role escalation.
3. Refactor all RBAC guards to check the full `roles` array.
4. Mask and secure all stored/handled PII & session artifacts.
5. Implement comprehensive audit and incident logging.
6. Ensure strong rate limiting and add MFA for all high-value actions or accounts.

**Summary:**  
The foundation is solid, but several "AI-gen" safety shortcuts (DEV bypass, mock users, weak RBAC) present critical risks in a regulated fintech context. Prioritizing strict environment controls, robust multi-role enforcement, and data protection will accelerate your path to a compliant, production-ready launch.

> *Prepared by Samir H. Senior Solution Architect.  

---

# Critical Infrastructure Critique & Recommendations

Although this code review focuses on security and application-level risks, the platform currently misses several foundational elements of a modern, production-ready infrastructure. These gaps are critical—especially for a regulated fintech context:

## 1. Lack of Containerization (Docker)
- **Risk:** No Docker leads to inconsistent environments, deployment errors, and increased troubleshooting effort across local/staging/production.
- **Recommendation:** Provide Dockerfiles and docker-compose setups for all major services (frontend, backend, edge functions) to ensure consistency, repeatability, and portability.

## 2. No Infrastructure-as-Code (IaC)
- **Risk:** Manual cloud/Supabase resource drift; Roles, RLS, buckets, and policies can't be versioned or peer reviewed.
- **Recommendation:** Use Terraform, Pulumi, or another IaC tool to define all infrastructure and access controls as code.

## 3. Lacking CI/CD Pipeline
- **Risk:** Risk of human error when deploying; potential for dev/test code or secrets to be accidentally shipped to production.
- **Recommendation:** Implement GitHub Actions (or similar) for gated, automated build, test, and deployment stages. Protect main/prod branches and automate secret/configuration management.

## 4. No Secrets Management
- **Risk:** API keys and sensitive credentials may be handled insecurely, e.g., in plaintext or exposed .env files.
- **Recommendation:** Use secure secrets management (GitHub Actions Secrets, HashiCorp Vault, or Supabase secrets) for all environments.

## 5. Environment Separation Missing
- **Risk:** Environments (prod, staging, dev) are not strictly separated; increases risk of data leakage or config mix-up.
- **Recommendation:** Fully separate configs and access levels per environment using proper deployment and feature toggling strategies.

## 6. No Centralized Logging/Observability
- **Risk:** No structure for logging, metrics, or alerting makes it difficult to handle incidents, performance analysis, or regulatory audits.
- **Recommendation:** Integrate centralized logging (Datadog, Sentry, ELK, etc.), metrics, and real-time alerting.

---

## Summary/Action Plan
- **Containerization**: Make Docker the baseline for both dev and prod.
- **CI/CD**: All commits go through automated, reviewed pipelines.
- **IaC**: All infra, policies, RBAC, and storage defined as code.
- **Secrets Management**: No plaintext secrets in code or repos ever.
- **Environment Separation**: Staging and prod never share data, users, or secrets.
- **Observability**: All errors, activity, and security events are logged and monitored centrally.

**Recommendation:** These improvements are non-negotiable for a compliant, scalable, and secure financial product. They should be prioritized alongside application security findings and can be delivered incrementally. Sample Dockerfiles, GitHub Actions workflows, and Terraform modules are available on request.

## Public Cloud Migration Benefits (AWS/Azure/GCP; DigitalOcean as lean option)
- **Enterprise-grade security & compliance**: Native services for KMS/HSM, IAM least-privilege, PrivateLink/VPC peering, managed WAF, Shield/DDoS, audit trails (CloudTrail/Activity Logs), with regional residency controls for UAE/GCC when available.
- **Scalability & resilience**: Auto-scaling, multi-AZ/region HA patterns, managed DR/backup, blue/green and canary deployments, traffic shaping and safe rollbacks.
- **Managed data platforms**: Fully managed Postgres, event streams (Kafka/PubSub/Event Hubs), data lakes/warehouses with lineage and governance for analytics and compliance reporting.
- **Observability & operations**: Centralized logging/metrics/tracing (CloudWatch/Stackdriver/App Insights), native alerting, SLO/SLA tracking, and incident tooling integration.
- **Zero-trust networking**: Private subnets, service meshes, mTLS, policy-as-code, and fine-grained network segmentation not feasible on simpler PaaS.
- **Secret management & key rotation**: KMS/KeyVault/CloudKMS, Secrets Manager, automatic rotation, envelope encryption, and per-service IAM scoping.
- **Stronger SDLC & platform engineering**: Native CI/CD, infra pipelines, artifact registries, SBOM/signing (SLSA), and policy gates for regulated change management.
- **Cost governance & FinOps**: Budgets, anomaly detection, chargeback/showback, rightsizing recommendations, and lifecycle policies across environments.
- **Ecosystem integrations**: Mature marketplace and partner solutions (fraud, AML, KYC, observability, security posture) that accelerate regulated fintech delivery.
- **DigitalOcean (cost-lean option)**: Simpler managed Postgres/Kubernetes, predictable pricing; suitable for non-critical workloads or lower tiers, with the option to graduate to hyperscalers for core systems.

## UAE PASS (BankID‑like) Integration Essentials
- **Protocol & Flow**: Use OIDC Authorization Code + PKCE. Validate `id_token` (signature via JWKs, `iss`, `aud`, `exp`, `nonce`). Enforce exact redirect URIs.
- **Assurance Tiers (Step‑up)**: Map UAE PASS LoA → `profiles.uae_pass_tier` (2/3). Require tier 3 for high‑risk actions (submission/disbursement). If user is tier 2, trigger step‑up with `acr_values` and verify `acr` claim on return.
- **Identity Mapping**: Persist `uaepass_sub` (stable subject), `uae_pass_tier`, `verified_at`. Upsert `profiles` from UAE PASS claims (name, email, phone, Emirates ID). Do not accept FE‑provided identity attributes.
- **Sessions & Cookies**: Server‑set, httpOnly, Secure, SameSite=strict cookies. Rotate refresh tokens after auth and step‑up. No tokens in localStorage/sessionStorage.
- **RBAC & RLS**: Authorize actions using role + `uae_pass_tier`. Add RLS checks (e.g., tenants must be tier 3 to submit), and enforce on server/DB side in addition to FE `RouteGuard`.
- **Edge Function Broker**:
  - `POST /auth/uae-pass/start`: generate `state`, `nonce`, PKCE challenge; store server‑side; 302 to UAE PASS.
  - `GET /auth/uae-pass/callback`: exchange code→tokens; validate `id_token`; upsert profile; create Supabase session; set cookie; redirect to app.
- **Security Controls**: Replay protection (single‑use `state`/`code_verifier`), strict redirect matching, rate limiting, anomaly detection on auth failures.
- **PII & Compliance**: Minimize stored attributes; encrypt Emirates ID at rest; redact from logs; audit log all auth events (start, success, failure, step‑up) with correlation IDs.
- **Environments & Secrets**: Separate sandbox/prod clients and redirects; store client secrets in a secret manager; rotate regularly.
