-- De trainer bleek in de praktijk niets te hebben aan het rechtstreeks
-- bewerken/verwijderen van logboekregels (0004_beheer_updates.sql) — wat
-- ze echt nodig had was de onderliggende scores kunnen corrigeren, en dat
-- kan al via Invoeren (de trainer heeft daar geen tijdslimiet). Dit trekt
-- de audit_log write-policies weer in: het logboek is weer alleen-lezen
-- vanaf de client, zoals het hoort voor een betrouwbaar spoor.

drop policy if exists "audit_log_update" on audit_log;
drop policy if exists "audit_log_delete" on audit_log;
