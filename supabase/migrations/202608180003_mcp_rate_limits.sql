-- Durable, cross-instance rate limiting for the hosted MCP server.
-- The application keeps an in-process counter as a first line of defence, but a
-- serverless deployment runs many instances, so the ceiling has to live in the
-- database. Counting happens per (user, client, bucket) so one noisy tool
-- cannot exhaust another tool's budget.

create table public.mcp_rate_limits (
  user_id uuid not null references auth.users on delete cascade,
  client_id text not null,
  bucket text not null check (char_length(bucket) between 1 and 100),
  window_start timestamptz not null default now(),
  count integer not null default 0 check (count >= 0),
  primary key (user_id, client_id, bucket)
);

alter table public.mcp_rate_limits enable row level security;

-- Owners may inspect their own usage; nobody writes through the table directly,
-- the security-definer function below is the only writer.
create policy rate_limits_owner_select on public.mcp_rate_limits for select to authenticated using (
  user_id = auth.uid()
);

create function public.consume_mcp_rate_limit(
  bucket_name text, request_cost integer, max_requests integer, window_seconds integer
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cid text := public.request_oauth_client_id();
  current public.mcp_rate_limits;
begin
  if uid is null or cid is null then
    return query select true, 0;
    return;
  end if;

  insert into public.mcp_rate_limits (user_id, client_id, bucket, window_start, count)
  values (uid, cid, bucket_name, now(), 0)
  on conflict (user_id, client_id, bucket) do nothing;

  select * into current from public.mcp_rate_limits
    where user_id = uid and client_id = cid and bucket = bucket_name for update;

  -- A stale window is reset rather than expired by a background job, so the
  -- table stays one row per active bucket with no cleanup schedule to run.
  if current.window_start + make_interval(secs => window_seconds) <= now() then
    update public.mcp_rate_limits set window_start = now(), count = greatest(request_cost, 0)
      where user_id = uid and client_id = cid and bucket = bucket_name;
    return query select true, 0;
    return;
  end if;

  if current.count + request_cost > max_requests then
    return query select false, greatest(
      1, ceil(extract(epoch from (current.window_start + make_interval(secs => window_seconds)) - now()))::integer
    );
    return;
  end if;

  update public.mcp_rate_limits set count = current.count + request_cost
    where user_id = uid and client_id = cid and bucket = bucket_name;
  return query select true, 0;
end $$;

revoke all on function public.consume_mcp_rate_limit(text,integer,integer,integer) from public;
grant execute on function public.consume_mcp_rate_limit(text,integer,integer,integer) to authenticated;
