-- Hero Fuel — base food library (~57 common Dutch items).
-- Values are indicative averages for guidance only: families should verify
-- against product labels or their dietitian, and can override anything via
-- custom_foods. Read-only for clients (see RLS migration).

insert into public.foods
  (name, protein_per_100g, protein_per_serving, serving_description, category, emoji)
values
  -- Fruit
  ('Appel', 0.3, 0.5, '1 appel (150 g)', 'Fruit', '🍎'),
  ('Banaan', 1.1, 1.3, '1 banaan (120 g)', 'Fruit', '🍌'),
  ('Aardbeien', 0.7, 0.9, 'schaaltje (125 g)', 'Fruit', '🍓'),
  ('Druiven', 0.6, 0.5, 'handje (80 g)', 'Fruit', '🍇'),
  ('Sinaasappel', 0.9, 1.2, '1 sinaasappel (130 g)', 'Fruit', '🍊'),
  ('Watermeloen', 0.6, 0.9, '1 plak (150 g)', 'Fruit', '🍉'),
  ('Peer', 0.4, 0.6, '1 peer (160 g)', 'Fruit', '🍐'),
  ('Kiwi', 1.1, 0.8, '1 kiwi (75 g)', 'Fruit', '🥝'),
  ('Mango', 0.8, 0.8, 'halve mango (100 g)', 'Fruit', '🥭'),
  ('Blauwe bessen', 0.7, 0.5, 'handje (75 g)', 'Fruit', '🫐'),

  -- Groente
  ('Komkommer', 0.7, 0.5, 'kwart komkommer (75 g)', 'Groente', '🥒'),
  ('Tomaat', 0.9, 0.9, '1 tomaat (100 g)', 'Groente', '🍅'),
  ('Wortel', 0.6, 0.5, '1 wortel (80 g)', 'Groente', '🥕'),
  ('Paprika', 1.0, 0.8, 'halve paprika (75 g)', 'Groente', '🫑'),
  ('IJsbergsla', 0.9, 0.5, 'schaaltje (50 g)', 'Groente', '🥬'),
  ('Broccoli', 3.0, 1.5, 'opscheplepel (50 g)', 'Groente', '🥦'),
  ('Bloemkool', 2.0, 1.0, 'opscheplepel (50 g)', 'Groente', '☁️'),
  ('Sperziebonen', 2.0, 1.0, 'opscheplepel (50 g)', 'Groente', '🫛'),
  ('Courgette', 1.2, 0.9, 'opscheplepel (75 g)', 'Groente', '🥒'),
  ('Champignons', 2.5, 1.3, 'opscheplepel (50 g)', 'Groente', '🍄'),

  -- Dranken
  ('Water', 0.0, 0.0, 'glas (200 ml)', 'Dranken', '💧'),
  ('Appelsap', 0.1, 0.2, 'glas (200 ml)', 'Dranken', '🧃'),
  ('Sinaasappelsap', 0.7, 1.4, 'glas (200 ml)', 'Dranken', '🍊'),
  ('Limonade (siroop)', 0.0, 0.0, 'glas aangemaakt (200 ml)', 'Dranken', '🥤'),
  ('Thee (zonder melk)', 0.0, 0.0, 'kop (150 ml)', 'Dranken', '🍵'),
  ('Cola', 0.0, 0.0, 'glas (200 ml)', 'Dranken', '🥤'),

  -- Snacks
  ('Chips naturel', 6.5, 1.6, 'klein zakje (25 g)', 'Snacks', '🥔'),
  ('Popcorn (zoet)', 12.0, 2.4, 'klein bakje (20 g)', 'Snacks', '🍿'),
  ('Waterijsje', 0.0, 0.0, '1 stuk (55 ml)', 'Snacks', '🧊'),
  ('Lolly', 0.0, 0.0, '1 stuk', 'Snacks', '🍭'),
  ('Rijstwafel', 7.5, 0.6, '1 wafel (8 g)', 'Snacks', '🍘'),
  ('Appelmoes', 0.2, 0.2, 'schaaltje (100 g)', 'Snacks', '🍏'),
  ('Fruitsnoepjes (zonder gelatine)', 0.1, 0.0, 'handje (25 g)', 'Snacks', '🍬'),

  -- Maaltijden
  ('Friet', 3.3, 3.3, 'klein bakje (100 g)', 'Maaltijden', '🍟'),
  ('Witte rijst (gekookt)', 2.7, 1.6, 'opscheplepel (60 g)', 'Maaltijden', '🍚'),
  ('Gekookte aardappel', 1.9, 1.3, '1 aardappel (70 g)', 'Maaltijden', '🥔'),
  ('Pasta (gekookt)', 5.0, 3.0, 'opscheplepel (60 g)', 'Maaltijden', '🍝'),
  ('Heldere groentesoep', 1.0, 2.0, 'kom (200 ml)', 'Maaltijden', '🍲'),
  ('Gebakken aardappeltjes', 2.2, 1.3, 'opscheplepel (60 g)', 'Maaltijden', '🍳'),

  -- Brood
  ('Wit brood', 8.5, 3.0, '1 snee (35 g)', 'Brood', '🍞'),
  ('Bruin brood', 9.5, 3.3, '1 snee (35 g)', 'Brood', '🍞'),
  ('Beschuit', 10.0, 1.0, '1 beschuit (10 g)', 'Brood', '🥯'),
  ('Cracker naturel', 10.0, 0.7, '1 cracker (7 g)', 'Brood', '🥨'),
  ('Knäckebröd', 11.0, 1.1, '1 stuk (10 g)', 'Brood', '🥖'),

  -- Zuivelvervangers
  ('Rijstdrink', 0.1, 0.2, 'glas (200 ml)', 'Zuivelvervangers', '🥛'),
  ('Kokosdrink', 0.2, 0.4, 'glas (200 ml)', 'Zuivelvervangers', '🥥'),
  ('Haverdrink', 1.0, 2.0, 'glas (200 ml)', 'Zuivelvervangers', '🌾'),
  ('Kokosyoghurt', 0.5, 0.5, 'schaaltje (100 g)', 'Zuivelvervangers', '🥥'),
  ('Rijstdessert (vanille)', 0.3, 0.3, 'schaaltje (110 g)', 'Zuivelvervangers', '🍮'),

  -- PKU-producten (eiwitarm)
  ('Eiwitarm brood', 0.5, 0.2, '1 snee (30 g)', 'PKU-producten', '🍞'),
  ('Eiwitarme pasta', 0.5, 0.8, 'portie gekookt (150 g)', 'PKU-producten', '🍝'),
  ('Eiwitarme rijstvervanger', 0.3, 0.5, 'portie gekookt (150 g)', 'PKU-producten', '🍚'),
  ('Eiwitarm meel', 0.4, 0.0, 'eetlepel (10 g)', 'PKU-producten', '🌾'),
  ('Eiwitarme pannenkoek', 0.6, 0.3, '1 pannenkoek (50 g)', 'PKU-producten', '🥞'),
  ('Eiwitarm koekje', 0.4, 0.1, '1 koekje (12 g)', 'PKU-producten', '🍪'),
  ('Eiwitarme melkvervanger', 0.4, 0.8, 'glas (200 ml)', 'PKU-producten', '🥛'),
  ('Eiwitarme chocolade', 0.8, 0.1, 'stukje (15 g)', 'PKU-producten', '🍫');
