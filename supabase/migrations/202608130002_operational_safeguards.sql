create policy audit_owner_insert on public.project_audit_events for insert to authenticated with check (
  user_id = auth.uid() and public.request_oauth_client_id() is null
);

create function public.touch_mcp_connection() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cid text := public.request_oauth_client_id();
begin
  if uid is null or cid is null then return; end if;
  update public.mcp_connections set last_used_at = now(), updated_at = now()
    where user_id = uid and client_id = cid and status = 'active';
end $$;
revoke all on function public.touch_mcp_connection() from public;
grant execute on function public.touch_mcp_connection() to authenticated;
