# Hosted MCP deployment

The application now uses Supabase for authenticated project storage and exposes the MCP server at the exact URL configured by `MCP_RESOURCE_URL` (normally `https://<app-domain>/mcp`).

## Supabase setup

1. Create separate Supabase projects for local/staging/production.
2. Apply both files in `supabase/migrations/` in timestamp order.
3. In Auth, enable email magic links and use asymmetric RS256 or ES256 JWT signing.
4. Enable the OAuth 2.1 server and dynamic client registration.
5. Set the custom authorization path to `https://<app-domain>/oauth/consent`.
6. Configure exact site/callback URLs, including `https://<app-domain>/auth/callback`.
7. Configure `public.custom_access_token_hook` as the custom access-token hook.
8. Configure the database setting `app.settings.mcp_resource_url` to the exact canonical MCP URL used by `MCP_RESOURCE_URL`. The hook assigns that audience only when an OAuth `client_id` is present.
9. Use short OAuth access-token lifetimes so revoked access JWTs age out quickly; grant revocation immediately invalidates refresh tokens and the local active-connection check rejects existing access tokens.

Never add a service-role key to the application environment. All application and MCP access uses the end-user token plus RLS/security-definer mutation functions.

## Application environment

Copy `.env.example` to the deployment secret store and set all values. Keep `MCP_CONNECTIONS_ENABLED=false` until OAuth discovery/consent has been tested in staging. Keep `MCP_WRITES_ENABLED=false` for the read-only rollout.

## Verification

Run:

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Then validate the remote endpoint with the official MCP Inspector and two independent Streamable HTTP/OAuth clients. Exercise both a 2026-07-28 client and the stateless 2025 fallback. Supabase-backed RLS integration tests require a configured disposable Supabase project and should verify cross-user, cross-client, revocation, concurrency, and idempotency behavior before enabling either feature flag.

The `/health` endpoint reports only process health. MCP failures produce a protected-resource challenge and never disclose project data.
