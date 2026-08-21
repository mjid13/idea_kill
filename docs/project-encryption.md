# Project encryption operations

IdeaUp stores `projects.data` as an AES-256-GCM envelope before it reaches
Supabase. Project names, ownership, revisions, and timestamps remain readable
so listing, MCP grants, and optimistic concurrency keep working. RLS remains
required; encryption supplements access control rather than replacing it.

Exports, authorized API/MCP responses, browser memory, and development-only
local storage are outside this database-encryption boundary.

## Server-only configuration

```text
PROJECT_ENCRYPTION_MODE=required
PROJECT_ENCRYPTION_ACTIVE_KEY_ID=2026-01
PROJECT_ENCRYPTION_KEYS={"2026-01":"<base64-encoded-32-byte-key>"}
```

Never use a `NEXT_PUBLIC_` prefix. Generate each key from 32 cryptographically
random bytes and store the key set in both the deployment secret store and a
separate restricted recovery vault. A database backup without its matching key
set is unrecoverable.

Modes are explicit:

- `off`: plaintext browser/local development only; production health rejects it.
- `prepare`: keys and dual reads are active, but writes remain plaintext. Use only before cutover.
- `required`: dual reads remain available for migration and every new write is encrypted.
- `read-only`: emergency mode that keeps reads available and rejects project writes.

## Safe rollout and backfill

1. Apply all migrations and deploy to staging in `prepare`; verify legacy reads.
2. Switch staging to `required`; test UI and MCP create/read/update/import flows.
3. Deploy production in `prepare` and smoke-test reads. Before the first encrypted write, the old build remains a valid rollback.
4. Switch production to `required`. After this point, roll back only to a crypto-capable build; use `read-only` if writes must stop.
5. Set `SUPABASE_SERVICE_ROLE_KEY` only in a temporary operator shell, never in the deployed app.
6. Run `npm run migrate:encrypt-projects` for a dry run, then `npm run migrate:encrypt-projects -- --apply`. Rerun to resolve concurrent-revision skips.
7. Confirm a final dry run reports no failures and all rows as already encrypted.
8. In the Supabase SQL editor run `select public.finalize_project_encryption();`. It refuses while plaintext rows remain.

The migration is resumable and does not increment project revisions or alter
`updated_at`. Historical provider backups may retain pre-migration plaintext
until their retention period expires.

## Key rotation and recovery

Add the new key while retaining all old keys, make the new ID active, deploy,
and run:

```bash
npm run migrate:encrypt-projects -- --apply --rotate
```

Remove an old runtime key only after no live row uses it. Retain it in recovery
storage until every backup encrypted with it has expired. Restore operations
must restore the database and matching key set together.

The migration reports counts only and never logs payloads. `/health` returns
503 without secret details when production storage or encryption configuration
is invalid. Corrupt ciphertext is rejected without being overwritten.
