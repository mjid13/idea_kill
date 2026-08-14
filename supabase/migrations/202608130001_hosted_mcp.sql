create extension if not exists pgcrypto;

create type public.mcp_access_mode as enum ('read', 'write');
create type public.mcp_connection_status as enum ('pending', 'active', 'revoked');
create type public.project_audit_action as enum ('create', 'update', 'import', 'grant_change');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  schema_version integer not null default 1 check (schema_version > 0),
  revision bigint not null default 1 check (revision > 0),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_updated_idx on public.projects (user_id, updated_at desc, id);

create table public.mcp_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  access_mode public.mcp_access_mode not null default 'read',
  client_name text not null default 'MCP client',
  client_uri text,
  metadata jsonb not null default '{}'::jsonb,
  status public.mcp_connection_status not null default 'pending',
  allow_create boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  primary key (user_id, client_id)
);

create table public.mcp_project_grants (
  user_id uuid not null,
  client_id text not null,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_id, project_id),
  foreign key (user_id, client_id) references public.mcp_connections(user_id, client_id) on delete cascade,
  foreign key (project_id) references public.projects(id) on delete cascade
);
create index mcp_project_grants_project_idx on public.mcp_project_grants (project_id);

create table public.project_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id text,
  action public.project_audit_action not null,
  idempotency_key text,
  revision_before bigint,
  revision_after bigint not null,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create unique index project_audit_mcp_idempotency_idx
  on public.project_audit_events (user_id, client_id, idempotency_key)
  where client_id is not null and idempotency_key is not null;
create index project_audit_recent_idx on public.project_audit_events (user_id, created_at desc);

alter table public.projects enable row level security;
alter table public.mcp_connections enable row level security;
alter table public.mcp_project_grants enable row level security;
alter table public.project_audit_events enable row level security;

create function public.request_oauth_client_id() returns text
language sql stable set search_path = '' as $$
  select nullif(coalesce(
    auth.jwt() ->> 'client_id',
    auth.jwt() -> 'app_metadata' ->> 'client_id'
  ), '')
$$;

create function public.has_active_project_grant(target_project_id uuid, require_write boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mcp_connections c
    join public.mcp_project_grants g
      on g.user_id = c.user_id and g.client_id = c.client_id
    where c.user_id = auth.uid()
      and c.client_id = public.request_oauth_client_id()
      and c.status = 'active'
      and (not require_write or c.access_mode = 'write')
      and g.project_id = target_project_id
  )
$$;

create policy projects_select on public.projects for select to authenticated using (
  user_id = auth.uid() and (
    public.request_oauth_client_id() is null or public.has_active_project_grant(id, false)
  )
);
create policy projects_insert_direct on public.projects for insert to authenticated with check (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);
create policy projects_update_direct on public.projects for update to authenticated using (
  user_id = auth.uid() and public.request_oauth_client_id() is null
) with check (user_id = auth.uid());
create policy projects_delete_direct on public.projects for delete to authenticated using (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);

create policy connections_owner_select on public.mcp_connections for select to authenticated using (
  user_id = auth.uid() and (public.request_oauth_client_id() is null or client_id = public.request_oauth_client_id())
);
create policy connections_owner_insert on public.mcp_connections for insert to authenticated with check (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);
create policy connections_owner_update on public.mcp_connections for update to authenticated using (
  user_id = auth.uid() and public.request_oauth_client_id() is null
) with check (user_id = auth.uid());
create policy connections_owner_delete on public.mcp_connections for delete to authenticated using (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);

create policy grants_owner_select on public.mcp_project_grants for select to authenticated using (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);
create policy grants_owner_insert on public.mcp_project_grants for insert to authenticated with check (
  user_id = auth.uid() and public.request_oauth_client_id() is null
  and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);
create policy grants_owner_delete on public.mcp_project_grants for delete to authenticated using (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);
create policy audit_owner_select on public.project_audit_events for select to authenticated using (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);

create function public.create_project_with_mcp_grant(
  project_name text, project_data jsonb, project_schema_version integer,
  request_idempotency_key text
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
  insert into public.projects(user_id, name, schema_version, revision, data)
    values (uid, project_name, project_schema_version, 1, project_data) returning * into created;
  insert into public.mcp_project_grants(user_id, client_id, project_id) values (uid, cid, created.id);
  insert into public.project_audit_events(user_id, project_id, client_id, action, idempotency_key, revision_after, changes)
    values (uid, created.id, cid, 'create', request_idempotency_key, 1, jsonb_build_array(jsonb_build_object('path', 'project', 'operation', 'create')));
  return created;
end $$;

create function public.apply_project_mutation(
  target_project_id uuid, expected_revision bigint, request_idempotency_key text,
  project_name text, project_data jsonb, allowed_changes jsonb
) returns public.projects
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); cid text := public.request_oauth_client_id();
  existing public.project_audit_events; current_row public.projects; updated public.projects;
begin
  if uid is null or cid is null or not public.has_active_project_grant(target_project_id, true) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into existing from public.project_audit_events
    where user_id = uid and client_id = cid and idempotency_key = request_idempotency_key;
  if found then select * into updated from public.projects where id = existing.project_id; return updated; end if;
  select * into current_row from public.projects where id = target_project_id and user_id = uid for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if current_row.revision <> expected_revision then
    raise exception 'REVISION_CONFLICT:%:%', current_row.revision, current_row.updated_at using errcode = '40001';
  end if;
  update public.projects set name = project_name, data = project_data,
    revision = revision + 1, updated_at = now()
    where id = target_project_id returning * into updated;
  insert into public.project_audit_events(user_id, project_id, client_id, action, idempotency_key,
    revision_before, revision_after, changes)
    values (uid, target_project_id, cid, 'update', request_idempotency_key,
      current_row.revision, updated.revision, allowed_changes);
  return updated;
end $$;

revoke all on function public.create_project_with_mcp_grant(text,jsonb,integer,text) from public;
grant execute on function public.create_project_with_mcp_grant(text,jsonb,integer,text) to authenticated;
revoke all on function public.apply_project_mutation(uuid,bigint,text,text,jsonb,jsonb) from public;
grant execute on function public.apply_project_mutation(uuid,bigint,text,text,jsonb,jsonb) to authenticated;

-- Supabase Auth custom access-token hook: configure this function in Auth > Hooks.
-- OAuth-issued tokens receive the exact MCP resource audience; ordinary app sessions keep their audience.
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare claims jsonb := event -> 'claims'; cid text;
begin
  cid := coalesce(claims ->> 'client_id', claims -> 'app_metadata' ->> 'client_id');
  if cid is not null and current_setting('app.settings.mcp_resource_url', true) is not null then
    claims := jsonb_set(claims, '{aud}', to_jsonb(current_setting('app.settings.mcp_resource_url', true)));
  end if;
  return jsonb_set(event, '{claims}', claims);
end $$;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
