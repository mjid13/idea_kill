-- Backward-compatible support for application-encrypted project payloads.
-- `projects.data` remains jsonb, but the application stores an authenticated
-- ciphertext envelope in it. The database deliberately treats it as opaque.

create function public.create_project_with_mcp_grant(
  target_project_id uuid, project_name text, project_data jsonb,
  project_schema_version integer, request_idempotency_key text
) returns public.projects
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); cid text := public.request_oauth_client_id();
  connection public.mcp_connections; existing public.project_audit_events; created public.projects;
begin
  if uid is null or cid is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into connection from public.mcp_connections
    where user_id = uid and client_id = cid and status = 'active' for update;
  if not found or connection.access_mode <> 'write' or not connection.allow_create then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into existing from public.project_audit_events
    where user_id = uid and client_id = cid and idempotency_key = request_idempotency_key;
  if found then select * into created from public.projects where id = existing.project_id; return created; end if;
  insert into public.projects(id, user_id, name, schema_version, revision, data)
    values (target_project_id, uid, project_name, project_schema_version, 1, project_data)
    returning * into created;
  insert into public.mcp_project_grants(user_id, client_id, project_id) values (uid, cid, created.id);
  insert into public.project_audit_events(user_id, project_id, client_id, action, idempotency_key, revision_after, changes)
    values (uid, created.id, cid, 'create', request_idempotency_key, 1,
      jsonb_build_array(jsonb_build_object('path', 'project', 'operation', 'create')));
  return created;
end $$;

revoke all on function public.create_project_with_mcp_grant(uuid,text,jsonb,integer,text) from public;
grant execute on function public.create_project_with_mcp_grant(uuid,text,jsonb,integer,text) to authenticated;

-- Audit rows retain useful attribution and public paths, not duplicated project
-- content. The trigger protects this invariant even during an application rollback.
create function public.sanitize_project_audit_changes(input jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case
    when jsonb_typeof(input) = 'object' and jsonb_typeof(input -> 'changes') = 'array' then
      jsonb_set(input, '{changes}', coalesce((
        select jsonb_agg(item - 'value' - 'previous' - 'internalPath')
        from jsonb_array_elements(input -> 'changes') item
      ), '[]'::jsonb))
    else input
  end
$$;

create function public.sanitize_project_audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.changes := public.sanitize_project_audit_changes(new.changes);
  return new;
end $$;

create trigger sanitize_project_audit_values
before insert or update of changes on public.project_audit_events
for each row execute function public.sanitize_project_audit_row();

update public.project_audit_events
set changes = public.sanitize_project_audit_changes(changes)
where jsonb_typeof(changes) = 'object' and jsonb_typeof(changes -> 'changes') = 'array';

revoke all on function public.sanitize_project_audit_changes(jsonb) from public;
revoke all on function public.sanitize_project_audit_row() from public;

-- Run this function manually from the SQL editor only after the online backfill
-- reports zero plaintext rows. It refuses to finalize early.
create function public.finalize_project_encryption() returns void
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.projects where not (
      jsonb_typeof(data) = 'object'
      and data ->> '_ideaup_encrypted' = 'true'
      and data ->> 'version' = '1'
      and data ->> 'algorithm' = 'A256GCM'
      and coalesce(data ->> 'keyId', '') <> ''
      and coalesce(data ->> 'nonce', '') <> ''
      and coalesce(data ->> 'ciphertext', '') <> ''
      and coalesce(data ->> 'tag', '') <> ''
    )
  ) then
    raise exception 'PLAINTEXT_PROJECTS_REMAIN' using errcode = '55000';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'projects_data_encrypted_envelope' and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects add constraint projects_data_encrypted_envelope check (
      jsonb_typeof(data) = 'object'
      and data ->> '_ideaup_encrypted' = 'true'
      and data ->> 'version' = '1'
      and data ->> 'algorithm' = 'A256GCM'
      and coalesce(data ->> 'keyId', '') <> ''
      and coalesce(data ->> 'nonce', '') <> ''
      and coalesce(data ->> 'ciphertext', '') <> ''
      and coalesce(data ->> 'tag', '') <> ''
    );
  end if;
end $$;

revoke all on function public.finalize_project_encryption() from public;
