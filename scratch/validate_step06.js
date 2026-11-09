const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const migrationPath = 'd:\\Quran-Data\\governance\\sql\\migration_phase0_corrected.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

const EXPECTED_TABLES = [
  'qcr_sources', 'qcr_source_versions', 'qcr_source_field_authorities',
  'qcr_ingestion_runs', 'qcr_provenance_entities', 'qcr_conflict_reconciliations',
  'qcr_knowledge_gaps', 'qcr_canonical_surahs', 'qcr_surah_metadata_variants',
  'qcr_canonical_ayahs', 'qcr_canonical_translations', 'qcr_morphology_tokens'
];
const EXPECTED_VIEWS = [
  'view_active_canonical_ayahs', 'view_opening_basmalas', 'view_sajda_verses'
];

try {
  const db = new DatabaseSync(':memory:');
  db.exec(sql);

  const fk = db.prepare('PRAGMA foreign_keys').get();
  const fkVal = fk[Object.keys(fk)[0]];
  console.log('FOREIGN_KEYS=' + fkVal);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).sort();
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all().map(r => r.name).sort();
  console.log('TABLES=' + JSON.stringify(tables));
  console.log('VIEWS=' + JSON.stringify(views));

  const missingT = EXPECTED_TABLES.filter(t => !tables.includes(t));
  const unexpectedT = tables.filter(t => !EXPECTED_TABLES.includes(t));
  const missingV = EXPECTED_VIEWS.filter(v => !views.includes(v));
  console.log('MISSING_TABLES=' + JSON.stringify(missingT));
  console.log('UNEXPECTED_TABLES=' + JSON.stringify(unexpectedT));
  console.log('MISSING_VIEWS=' + JSON.stringify(missingV));

  let constraintPass = true;

  // PKs
  for (const t of EXPECTED_TABLES) {
    const info = db.prepare('PRAGMA table_info(' + t + ')').all();
    const pks = info.filter(c => c.pk > 0);
    if (pks.length === 0) { console.log('FAIL_PK: ' + t); constraintPass = false; }
  }

  // FKs on tables that should have them
  const fkTables = ['qcr_source_versions', 'qcr_source_field_authorities', 'qcr_provenance_entities',
    'qcr_canonical_surahs', 'qcr_surah_metadata_variants', 'qcr_canonical_ayahs',
    'qcr_canonical_translations'];
  for (const t of fkTables) {
    const fks = db.prepare('PRAGMA foreign_key_list(' + t + ')').all();
    if (fks.length === 0) { console.log('FAIL_FK: ' + t); constraintPass = false; }
  }

  // UNIQUE constraints on qcr_canonical_ayahs: record_id + composite (surah,ayah,basmala)
  const ayahIdxs = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='qcr_canonical_ayahs'").all().map(i => i.name);
  // SQLite creates autoindexes for UNIQUE constraints
  const hasAutoIdx = ayahIdxs.filter(n => n.startsWith('sqlite_autoindex_qcr_canonical_ayahs_'));
  if (hasAutoIdx.length < 2) { console.log('FAIL_UNIQUE: expected 2 autoindexes, got ' + hasAutoIdx.length); constraintPass = false; }

  // Performance indexes
  const allIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(i => i.name);
  for (const idx of ['idx_canonical_ayah_lookup', 'idx_canonical_ayah_page', 'idx_canonical_ayah_juz', 'idx_morph_root', 'idx_provenance_key']) {
    if (!allIndexes.includes(idx)) { console.log('FAIL_IDX: ' + idx); constraintPass = false; }
  }

  // CHECK constraints: try inserting invalid data
  try { db.exec("INSERT INTO qcr_sources VALUES('x','n','INVALID','f','a','l','p','h',1,CURRENT_TIMESTAMP,'R')"); console.log('FAIL_CHECK: epistemic_tier accepted INVALID'); constraintPass = false; } catch(e) { /* expected */ }
  try { db.exec("INSERT INTO qcr_canonical_surahs VALUES(0,'a','e',NULL,1,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL)"); console.log('FAIL_CHECK: surah_number 0 accepted'); constraintPass = false; } catch(e) { /* expected */ }
  try { db.exec("INSERT INTO qcr_canonical_surahs VALUES(115,'a','e',NULL,1,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL)"); console.log('FAIL_CHECK: surah_number 115 accepted'); constraintPass = false; } catch(e) { /* expected */ }

  console.log('CONSTRAINT_VALIDATION=' + (constraintPass ? 'PASS' : 'FAIL'));

  const pass = missingT.length === 0 && unexpectedT.length === 0 && missingV.length === 0 && constraintPass && fkVal === 1;
  console.log('STEP06_RESULT=' + (pass ? 'PASS' : 'FAIL'));
  db.close();
} catch (e) {
  console.error('STEP06_RESULT=FAIL');
  console.error('ERROR=' + e.message);
}
