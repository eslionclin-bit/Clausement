-- Basisoefeningen uit het Handboek (vast, read-only — zie exercises_write policy).
-- Overgenomen 1-op-1 uit clausement.jsx (de originele artifact-app bevat 39
-- vaste basisoefeningen; teams kunnen daarnaast eigen oefeningen toevoegen
-- via Beheer).

insert into exercises (id, cat, station, name, metric, higher_is_better, description, is_custom) values
('base-1', 'Techniek & precisie', 'Veld', 'Serveer-doelzone', 'aantal raak van de 10', true, '10 services naar een afgebakend vak. Score = aantal raak; verbeter je eigen record.', false),
('base-7', 'Techniek & precisie', 'Muur', 'Onderarms-passtest tegen de muur', 'aantal contacten op rij', true, 'Zoveel mogelijk onderarmse passes tegen de muur binnen een vak, tot de bal het vak verlaat of valt.', false),
('base-9', 'Techniek & precisie', 'Net', 'Setnauwkeurigheid op hoogte en plek', 'aantal geslaagd van de 10', true, '10 pogingen om exact op een gemarkeerde plek/hoogte bij het net te zetten.', false),
('base-11', 'Techniek & precisie', 'Veld', 'Servicevariatie-uitdaging', 'aantal geslaagd van de 3', true, '3 technieken na elkaar: bovenhands vlak, sprongservice, en een precisieservice op een klein vak. (Voor beginners mag onderhands de eerste vervangen.) Bonuspunt bij een voor het eerst geslaagde techniek.', false),
('base-12', 'Techniek & precisie', 'Veld', 'Voetenwerk-parcours bij de pass', 'aantal correct van de 10', true, '10 wisselend ingegooide ballen correct passen, met de juiste voetpositie.', false),
('base-40', 'Techniek & precisie', 'Vrij', 'Kast als mikpunt', 'aantal raak van de 10', true, 'Sla/serveer de bal vanaf 4 meter tegen een gemarkeerd vlak op een rechtopstaande kast — 10 pogingen, tel het aantal raak.', false),
('base-49', 'Techniek & precisie', 'Muur', 'Zetten tegen de muur op doelhoogte', 'aantal contacten op rij', true, 'Bovenhands zetten tegen een gemarkeerd punt op de muur; tel het aantal geslaagde zetten op rij. Geen net nodig.', false),
('base-50', 'Techniek & precisie', 'Muur', 'Muur-aanval (wall spike)', 'aantal raak van de 10', true, 'Korte aanloop, sla de bal tegen een laag gemarkeerd muurdoel — 10 pogingen. Geen net nodig.', false),

('base-4', 'Snelheid & behendigheid', 'Veld', 'Reactie-/sprintparcours op tijd', 'seconden (lager is beter)', false, '5-10-5 shuttle: sprint 5m naar een lijn, raak aan, sprint 10m naar de andere lijn, raak aan, sprint 5m terug. Niveau 1: zonder bal. Niveau 2: bal in de hand meedragen. Niveau 3: bal bij elk keerpunt laten stuiteren.', false),
('base-8', 'Snelheid & behendigheid', 'Veld', 'Eén-tegen-de-klok verdedigingsreeks', 'aantal verdedigd in 30 sec', true, '30 seconden zoveel mogelijk snel ingespeelde ballen verdedigen.', false),
('base-10', 'Snelheid & behendigheid', 'Net', 'Blokreactietijd', 'aantal op tijd van de 10', true, '10 pogingen zo snel mogelijk in blokhouding springen op een willekeurig signaal.', false),
('base-42', 'Snelheid & behendigheid', 'Mat', 'Rol-en-recover', 'aantal geslaagd van de 10', true, 'Rol op de mat (voorwaarts of zijwaarts — kies zelf, zijwaarts is wedstrijdechter), direct opstaan en een ingespeelde bal verdedigen. 10 pogingen.', false),
('base-51', 'Snelheid & behendigheid', 'Mat', 'Solo pancake-reflex', 'aantal geslaagd van de 10', true, 'Bal wordt laag opzij van je gegooid; probeer ''m met een lage redding (pancake) te redden. 10 pogingen.', false),
('base-53', 'Snelheid & behendigheid', 'Vrij', 'Eén-arm balcontrole', 'aantal contacten op rij', true, 'Passen met alleen één arm/platform, ter verfijning van balcontrole.', false),

('base-3', 'Lengte & kracht', 'Muur', 'Sprongreik-meting (DIY)', 'cm sprongverschil', true, 'Meetlint + krijt tegen de muur: verschil tussen sta-reik en sprong-reik.', false),
('base-39', 'Lengte & kracht', 'Net', 'Kastsprong-aanval (depth jump)', 'aantal geslaagd van de 5', true, 'Van een lage kast afstappen, direct explosief omhoog en een aanvalsbeweging op een ingegooide bal. 5 pogingen, minimale grondcontacttijd is de crux.', false),
('base-41', 'Lengte & kracht', 'Vrij', 'Medicijnbal-rotatieworp', 'meter (verste worp)', true, 'Bal vanuit een rompdraai zo ver mogelijk zijwaarts gooien. Gehaald = verder dan je vorige beste worp.', false),
('base-52', 'Lengte & kracht', 'Muur', 'Aanloop-sprongtouch', 'cm (hoogste aangetikte punt t.o.v. sta-reik)', true, '3- of 4-stappen aanvalsaanloop, spring en raak een gemarkeerd punt op de muur/paal — traint de aanloop-timing van een echte smash.', false),

('base-5', 'Mentaal & team', 'Veld', 'Serveerreeks zonder fout', 'langste streak (aantal op rij)', true, 'Serveer net zo lang door tot een fout; probeer je eigen streak-record te verbeteren.', false),
('base-13', 'Mentaal & team', 'Mat', 'Duik/val-oefening op comfortniveau', 'aantal geslaagd van de 10', true, 'Kies je niveau: stilstand → korte aanloop → volledige aanloop → reddingsactie op ingespeelde bal → reddingsactie op een steeds verder weg gegooide bal. 10 pogingen op je gekozen niveau; schuif door naar het volgende niveau zodra dat te makkelijk wordt.', false),
('base-14', 'Mentaal & team', 'Veld', 'Servicedruk-simulatie', 'langste streak onder druk', true, 'Serveren terwijl het team een nagebootste spannende wedstrijdsituatie aankondigt (bv. ''set point''). Score = langste reeks geslaagde services op rij onder die druk.', false),
('base-15', 'Mentaal & team', 'Vrij', 'Eigen zwakte-oefening', 'zelfbeoordeling 1-10', true, 'Een zelfgekozen ontwikkelpunt bij de start van de cyclus; maandelijks beoordeel je zelf (1-10) hoeveel beter het gaat t.o.v. je 0-meting.', false),
('base-2', 'Mentaal & team', 'Vrij', 'Jongleren (progressief)', 'aantal contacten op rij', true, 'Eén oefening, vier oplopende niveaus: 1) sjaals, 2) volleybal met de handen, 3) tennisbal, 4) twee ballen tegelijk. Schuif pas door naar het volgende niveau als je huidige niveau goed onder controle is — dat is de echte uitdaging, niet vier losse spelletjes.', false),

('base-17', 'Coördinatie', 'Vrij', 'Voet-tik-oefening', 'aantal contacten op rij', true, 'Bal tikken tussen linker- en rechtervoet, freestyle-football-stijl. Gehaald = eigen record contacten op rij verbeterd.', false),
('base-18', 'Coördinatie', 'Vrij', 'Kruiscoördinatie-warming-up', 'aantal herhalingen in 20 sec', true, 'Kruislings hand-knie-patroon, steeds sneller opbouwen.', false),
('base-19', 'Coördinatie', 'Vrij', 'Balanceren op wankele ondergrond', 'aantal succesvolle vangsten van de 10', true, 'Op een balansplank/opgerolde mat een bal vangen en teruggooien.', false),
('base-20', 'Coördinatie', 'Vrij', 'Reactiebal vangen', 'aantal geslaagd van de 10', true, 'Een onvoorspelbaar stuiterende reactiebal proberen te vangen. Verzwaren: grotere afstand, harder gooien, of twee reactieballen tegelijk.', false),
('base-37', 'Coördinatie', 'Vrij', 'Bank-balans-pass', 'aantal contacten op rij', true, 'Op een bank staand onderarms overspelen met je partner.', false),
('base-38', 'Coördinatie', 'Vrij', 'Bank-step-overspeel', 'aantal succesvol op rij', true, 'Om de beurt op/van een bank stappen terwijl je blijft overspelen.', false),

('base-24', 'Balvaardigheid buiten volleybal', 'Vrij', 'Voetbal keepie-uppies', 'aantal contacten op rij', true, 'Jongleren met de voet; traint algemene balcoördinatie.', false),

('base-32', 'Fysiek & conditie', 'Vrij', 'Plank-uithoudingstest', 'seconden volgehouden', true, 'Tijd bijhouden in plankhouding, eigen record verslaan.', false),
('base-43', 'Fysiek & conditie', 'Vrij', 'Medicijnbal-plank-tik', 'aantal tikken op rij', true, 'In plankhouding de medicijnbal van hand naar hand rollen.', false),
('base-33', 'Fysiek & conditie', 'Vrij', 'Enkelbalans op één been', 'seconden volgehouden', true, 'Zo lang mogelijk op één been staan, eventueel met ogen dicht.', false),
('base-34', 'Fysiek & conditie', 'Vrij', 'Sprongherhaaltest', 'aantal tuck jumps in 30 sec', true, 'Zoveel mogelijk tuck jumps (knieën optrekken) in 30 seconden.', false),

('base-44', 'Positiespecifiek', 'Net', 'Doortik-beslissingsoefening (spelverdeelster)', 'aantal juiste beslissingen van de 10', true, 'Bij een goede pass normaal zetten, bij een matige pass razendsnel een doortikbal kiezen. Score op de juiste beslissing, niet alleen op uitvoering.', false),
('base-45', 'Positiespecifiek', 'Net', 'Zone-aanval met blok-lezen (aanvalster)', 'aantal geslaagd van de 10', true, 'Eerst een vaste doelzone raken; later kiezen tussen line, cross en tip op basis van een gesimuleerd blok (levende partner, geen video).', false),
('base-46', 'Positiespecifiek', 'Veld', 'Precisie-ontvangst onder wisselende service (libero/passer)', 'aantal geslaagd van de 10', true, 'Afwisselend harde, korte en lage services steeds naar dezelfde doelzone passen.', false),
('base-47', 'Positiespecifiek', 'Net', 'Quick-set timing-sync (middenaanvalster)', 'aantal juiste timing van de 10', true, 'Al in de lucht zijn vóórdat de setter een snelle aanval loslaat.', false),
('base-48', 'Positiespecifiek', 'Net', 'Blok-transitie-sprint (midden/diagonaal)', 'seconden (lager is beter)', false, 'Na een blokactie razendsnel omschakelen naar aanvalspositie aan de andere kant van het net.', false)
on conflict (id) do nothing;
