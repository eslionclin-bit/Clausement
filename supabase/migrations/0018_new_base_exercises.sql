-- Twee nieuwe vaste basisoefeningen (trainer-verzoek), toegevoegd aan de
-- EXERCISES-lijst zelf (is_custom = false) — niet via de eigen-oefeningen-
-- functionaliteit voor spelers.

insert into exercises (id, cat, station, name, metric, higher_is_better, description, is_custom) values
('base-54', 'Snelheid & behendigheid', 'Veld', 'Sprint-serveertest', 'aantal geslaagd van de 10', true,
 'Sprint eerst een vast stuk (bijv. achterlijn-net-retour), serveer daarna direct 10 ballen naar een doelvak. Traint servicedruk onder fysieke vermoeidheid, als aanvulling op de sociale-druk-variant (Servicedruk-simulatie).', false),
('base-55', 'Coördinatie', 'Vrij', 'Balcontrole-circuit', 'aantal volledige reeksen achter elkaar zonder fout', true,
 'Werk een vaste volgorde af zonder de bal te laten vallen: linkerhand (backhand), rechterhand (binnenkant hand), linkervoet, rechtervoet, hoofd, vangen achter de rug. Score = aantal volledige reeksen op rij zonder fout (streak, geen plafond). Traint vooral coördinatie en balgevoel — dit is geen directe volleybaltechniek.', false)
on conflict (id) do nothing;
