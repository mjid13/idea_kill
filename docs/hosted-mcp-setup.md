# Hosted MCP deployment

Production runs at your deployment target, optionally behind a reverse proxy / CDN.

The application now uses Supabase for authenticated project storage and exposes the MCP server at the exact URL configured by `MCP_RESOURCE_URL` (normally `https://your-app.example.com/mcp`).

## Supabase setup

1. Create separate Supabase projects for local/staging/production.
2. Apply every file in `supabase/migrations/` in timestamp order. `202608180003_mcp_rate_limits.sql` is optional but recommended: without it the server falls back to a per-instance counter, which a multi-instance deployment cannot rely on.
3. In Auth, enable email magic links and use asymmetric RS256 or ES256 JWT signing.
4. Enable the OAuth 2.1 server and dynamic client registration.
5. Set the custom authorization path to `https://your-app.example.com/oauth/consent`.
6. Configure exact site/callback URLs, including `https://your-app.example.com/auth/callback`.
7. Configure `public.custom_access_token_hook` as the custom access-token hook.
8. Configure the database setting `app.settings.mcp_resource_url` to `https://your-app.example.com/mcp` (the exact canonical MCP URL used by `MCP_RESOURCE_URL`). The hook assigns that audience only when an OAuth `client_id` is present.
9. Use short OAuth access-token lifetimes so revoked access JWTs age out quickly; grant revocation immediately invalidates refresh tokens and the local active-connection check rejects existing access tokens.

Never add a service-role key to the application environment. All application and MCP access uses the end-user token plus RLS/security-definer mutation functions.

## Application environment

```
NEXT_PUBLIC_APP_URL=https://your-app.example.com
MCP_RESOURCE_URL=https://your-app.example.com/mcp
```

`NEXT_PUBLIC_*` values are inlined at build time — redeploy after changing them. If fronting the app with Cloudflare, use **Full (strict)** SSL; "Flexible" causes an infinite 301 loop at the host's edge before requests ever reach the app. Keep `MCP_CONNECTIONS_ENABLED=false` until OAuth discovery/consent has been tested in staging. Keep `MCP_WRITES_ENABLED=false` for the read-only rollout.

## Limits

Rate limiting has two layers, and the second one is the load-bearing one:

1. **Budget per minute, per (user, client, bucket).** Reads share 120 points, writes 20. Each tool declares a cost: ordinary reads 1, analysis 2, scenarios / comparisons / readiness / export 3, writes 5, `run_monte_carlo` 10. The in-process counter runs first; `consume_mcp_rate_limit` (added by `202608180003_mcp_rate_limits.sql`) enforces the same budget across instances. If that function is absent, the durable check is skipped and only the per-instance counter applies.
2. **Hard input caps.** Monte Carlo iterations ≤ 5000, lender repayment schedule ≤ 360 rows, import bundle ≤ 1 MB, `get_writable_paths` ≤ 2000 paths, `update_project` ≤ 30 changes, `compare_projects` ≤ 5 projects. Bounding the work a single request can ask for is what actually protects a serverless deployment.

## Writing data

Writes require all three of: `MCP_WRITES_ENABLED=true`, a connection in read/write mode, and — for `create_project` / `import_project` — the owner having allowed project creation at `/settings/connections`.

- **Paths** use public section names: `one_pager.problem`, `pricing.productPrice.value`, `marketplace.takeRatePct.value`, `debt.loanAmount.value`. Call `get_writable_paths` rather than guessing; it also lists which lists support item-level edits.
- **Ranges.** Any assumption can carry `….range.low` / `….range.high` with `.value` as the most likely point between them. Ranged assumptions are what `run_monte_carlo` samples; a project with none gets an explanation instead of a simulation.
- **Lists.** One item is addressable as `revenue_streams[<id>].price.value` for edits. Adding, removing, and reordering go through `add_revenue_stream`, `remove_revenue_stream`, `reorder_revenue_streams`, and `edit_list`. Each of those is one call, one revision, one audit row.
- **Concurrency.** Every write takes `expected_revision` and a fresh `idempotency_key`. A stale revision returns `REVISION_CONFLICT` carrying the current revision; a replayed key is a no-op that returns the existing row.
- **Errors** arrive as tool errors whose first line is `CODE: message` and whose second line is `{"error":{code,message,details,retryable,hint}}`. Codes: `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_FAILED`, `REVISION_CONFLICT`, `GRANT_REVOKED`, `DUPLICATE_REQUEST`, `RATE_LIMITED`, `INTERNAL_ERROR`. Raw database text is never forwarded.
- **Audit.** Every write records the public path used, the internal path, the operation, the previous value, and the client's stated `reason`. Grant and revoke changes made in the settings UI are recorded as `grant_change` events. The owner reads all of it at `/settings/connections`.

## Verification

Run:

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Then validate the remote endpoint with the official MCP Inspector and two independent Streamable HTTP/OAuth clients. With `MCP_WRITES_ENABLED=false`, confirm: tool titles and `{id}` completion appear; `marketplace` and `debt` sections are readable; `run_monte_carlo` returns a simulation on a project with ranges and actionable guidance on one without; `get_lender_assessment` and `get_investor_assessment` return interpolated checks with no `{placeholder}` text. With writes enabled on staging, add a revenue stream, edit one of its fields, remove it, and confirm each call bumps the revision exactly once, a replayed idempotency key is a no-op, a stale `expected_revision` returns structured conflict details, and `/settings/connections` shows the audit rows with public paths and the stated reason. Also toggle "Allow project creation" off and on there and reload: the checkbox must reflect stored state. Exercise both a 2026-07-28 client and the stateless 2025 fallback. Supabase-backed RLS integration tests require a configured disposable Supabase project and should verify cross-user, cross-client, revocation, concurrency, and idempotency behavior before enabling either feature flag.

The `/health` endpoint reports only process health. MCP failures produce a protected-resource challenge and never disclose project data.
