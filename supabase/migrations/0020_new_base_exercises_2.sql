-- Drie nieuwe vaste basisoefeningen (trainer-verzoek), toegevoegd aan de
-- EXERCISES-lijst zelf (is_custom = false) — niet via de eigen-oefeningen-
-- functionaliteit voor spelers.

insert into exercises (id, cat, station, name, metric, higher_is_better, description, is_custom) values
('base-57', 'Techniek & precisie', 'Muur', 'Aanval-en-redding tegen de muur', 'langste serie geslaagde aanval-plus-redding-cycli zonder dat de bal de grond raakt', true,
 'Gooi de bal zelf omhoog, sla ''m met echte aanvaltechniek tegen een muur (vanaf een paar meter afstand), en verdedig/pass de terugkaatsende bal direct met correcte techniek — daarna opnieuw.', false),
('base-58', 'Techniek & precisie', 'Vrij', 'Zelf-opspelen met oplopende hoogte', 'langste serie oplopende contacten', true,
 'Speel de bal naar jezelf op, waarbij elk volgend contact hoger moet zijn dan het vorige — net zo lang tot je de bal laat vallen of niet hoger krijgt dan de vorige keer; plafond is doorgaan.', false),
('base-59', 'Techniek & precisie', 'Muur', 'Richtingswissel-pass', 'langste serie correct afgewisselde passes', true,
 'Speel de bal steeds afwisselend naar een linker- en een rechterdoelzone (bijvoorbeeld twee gemarkeerde vakken op de muur), zonder de volgorde te breken.', false)
on conflict (id) do nothing;
