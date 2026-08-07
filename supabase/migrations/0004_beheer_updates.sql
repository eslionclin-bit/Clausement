-- Vier samenhangende wijzigingen:
-- 1) Eigen Recordboek-oefeningen: niet langer trainer-only, elke speler mag
--    ze toevoegen/wijzigen/verwijderen (basisoefeningen blijven vast).
-- 2) Logboek: de trainer mag regels direct bewerken (wie) of verwijderen.
-- 3) close_period: startdatum van de nieuwe periode is nu instelbaar
--    (gaten tussen periodes zijn toegestaan) i.p.v. altijd "vandaag".
-- 4) start_new_season: harde reset van Recordboek + periode-telling voor
--    een nieuw seizoen, trainer-only.

-- 1) Eigen oefeningen open voor iedereen (nog steeds nooit de basisset)
drop policy if exists "exercises_write" on exercises;
create policy "exercises_write" on exercises for all to authenticated
  using (is_custom) with check (is_custom);

-- 2) Logboek direct bewerkbaar/verwijderbaar door de trainer
drop policy if exists "audit_log_update" on audit_log;
create policy "audit_log_update" on audit_log for update to authenticated
  using (is_trainer()) with check (is_trainer());
drop policy if exists "audit_log_delete" on audit_log;
create policy "audit_log_delete" on audit_log for delete to authenticated
  using (is_trainer());

-- 3) close_period met instelbare startdatum voor de nieuwe periode
drop function if exists public.close_period(text);

create or replace function public.close_period(p_actor text, p_next_start_date date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active record;
  v_start date;
begin
  if not is_trainer() then
    raise exception 'Alleen de trainer kan een periode afronden';
  end if;

  select id, number into v_active from periods where end_date is null;
  if v_active.id is null then
    raise exception 'Geen actieve periode gevonden';
  end if;

  v_start := coalesce(p_next_start_date, current_date);
  if v_start < current_date then
    raise exception 'De startdatum van de nieuwe periode mag niet in het verleden liggen';
  end if;

  update periods set end_date = current_date where id = v_active.id;
  insert into periods (number, start_date, end_date) values (v_active.number + 1, v_start, null);
end;
$$;

revoke all on function public.close_period(text, date) from public;
grant execute on function public.close_period(text, date) to authenticated;

-- 4) Nieuw seizoen starten (harde reset, trainer-only)
alter table audit_log drop constraint if exists audit_log_action_check;
alter table audit_log add constraint audit_log_action_check
  check (action in ('aangemaakt', 'gewijzigd', 'verwijderd', 'seizoen gestart'));

create or replace function public.start_new_season(p_actor text, p_start_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_trainer() then
    raise exception 'Alleen de trainer kan een nieuw seizoen starten';
  end if;

  delete from cycle_bonuses where true;
  delete from personal_records where true;
  delete from goal_history where true;
  delete from goals where true;
  delete from trainings where true; -- cascadeert naar training_scores
  delete from periods where true;

  insert into periods (number, start_date, end_date) values (1, p_start_date, null);

  insert into audit_log (by_name, action, training_date, summary)
    values (p_actor, 'seizoen gestart', p_start_date, '[]'::jsonb);
end;
$$;

revoke all on function public.start_new_season(text, date) from public;
grant execute on function public.start_new_season(text, date) to authenticated;
