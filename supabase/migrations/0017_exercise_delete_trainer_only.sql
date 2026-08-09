-- Eigen Recordboek-oefeningen mogen door elke speler worden toegevoegd en
-- gewijzigd (zie 0004_beheer_updates.sql), maar verwijderen is nu
-- trainer-only — een speler kan niet meer per ongeluk (of expres) een
-- oefening laten verdwijnen die een teamgenote heeft toegevoegd en waar
-- misschien al scores op staan. De vaste basisoefeningen (is_custom =
-- false) blijven — ongeacht wie het probeert — sowieso altijd onwijzigbaar
-- en onverwijderbaar, dat verandert hier niet.

drop policy if exists "exercises_write" on exercises;

create policy "exercises_insert" on exercises for insert to authenticated
  with check (is_custom);

create policy "exercises_update" on exercises for update to authenticated
  using (is_custom) with check (is_custom);

create policy "exercises_delete" on exercises for delete to authenticated
  using (is_custom and is_trainer());
