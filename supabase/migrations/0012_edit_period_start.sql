-- De trainer kon de startdatum van de huidige (actieve) periode nergens
-- rechtstreeks aanpassen — alleen de startdatum van de vólgende periode
-- instellen bij het afronden. Nodig gebleken toen bleek dat de periode per
-- ongeluk op een latere datum was gestart dan de eerste ingevoerde
-- trainingen, waardoor die trainingen buiten Standen vielen (ze telden wél
-- gewoon mee in het seizoensbrede Recordboek).

create or replace function public.update_period_start(p_actor text, p_start_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active record;
begin
  if not is_trainer() then
    raise exception 'Alleen de trainer kan de startdatum van de huidige periode aanpassen';
  end if;

  select id into v_active from periods where end_date is null;
  if v_active.id is null then
    raise exception 'Geen actieve periode gevonden';
  end if;

  update periods set start_date = p_start_date where id = v_active.id;
end;
$$;

revoke all on function public.update_period_start(text, date) from public;
grant execute on function public.update_period_start(text, date) to authenticated;
