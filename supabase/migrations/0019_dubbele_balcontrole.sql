-- Derde nieuwe vaste basisoefening (trainer-verzoek): een technischere,
-- zwaardere variant naast de bestaande "Jongleren (progressief)" (base-2,
-- waarvan niveau 4 al "twee ballen tegelijk" is) — deze oefening staat op
-- zichzelf, met een eigen, strengere score-definitie.

insert into exercises (id, cat, station, name, metric, higher_is_better, description, is_custom) values
('base-56', 'Techniek & precisie', 'Vrij', 'Dubbele bal-controle', 'beste aaneengesloten serie contacten', true,
 'Speel met twee volleyballen tegelijk, met pas-/settechniek (geen gooien-vangen), en houd beide ballen zo lang mogelijk tegelijk in de lucht. De serie stopt zodra één van de twee ballen de grond raakt. Score = totaal aantal gelukte contacten (beide ballen samen) in de beste poging van de training.', false)
on conflict (id) do nothing;
