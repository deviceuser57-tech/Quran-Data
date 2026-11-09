/* Phase‑0 migration generated for Batch 2 (steps 5‑6) */
CREATE TABLE IF NOT EXISTS surahs (
  number INTEGER PRIMARY KEY,
  name_ar TEXT,
  name_en TEXT,
  name_transliteration TEXT,
  revelation_place_ar TEXT,
  revelation_place_en TEXT,
  verses_count INTEGER,
  words_count INTEGER,
  letters_count INTEGER
);

CREATE TABLE IF NOT EXISTS verses (
  surah_number INTEGER,
  number INTEGER,
  text_ar TEXT,
  text_en TEXT,
  juz INTEGER,
  page INTEGER,
  sajda BOOLEAN,
  PRIMARY KEY (surah_number, number),
  FOREIGN KEY (surah_number) REFERENCES surahs(number)
);

CREATE TABLE IF NOT EXISTS audio (
  id INTEGER PRIMARY KEY,
  surah_number INTEGER,
  reciter_ar TEXT,
  reciter_en TEXT,
  rewaya_ar TEXT,
  rewaya_en TEXT,
  server TEXT,
  link TEXT,
  FOREIGN KEY (surah_number) REFERENCES surahs(number)
);

