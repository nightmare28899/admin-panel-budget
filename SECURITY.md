# Security Checklist

## Before Deploy

- Set `NEXT_PUBLIC_API_URL` to the production backend over HTTPS.
- Keep the admin panel and backend on the same site boundary if you depend on `SameSite=Strict` cookies.
- Restrict preview/staging deployments the same way as production because the UI now validates admin access against the API on every protected request.

## After Deploy

- Confirm login issues only `admin_token` and `admin_refresh_token` cookies and that both are `HttpOnly`, `Secure` in production, and `SameSite=Strict`.
- Confirm non-admin accounts are rejected after login and during session renewal.
- Confirm dashboard routes redirect to `/login` when the backend session is expired or revoked.

## Operations

- Use backend logout/session revocation on admin offboarding instead of only deleting browser cookies.
- Rotate backend JWT secrets if an admin browser session is suspected to be compromised.
- Keep the admin panel dependency tree current; `npm audit --omit=dev` is clean after the Next.js upgrade in this repo.
