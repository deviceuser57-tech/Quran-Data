const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = 'd:\\Quran-Data\\governance\\phase0_workspace\\shadow\\phase0_shadow.sqlite';
const migrationPath = 'd:\\Quran-Data\\governance\\sql\\migration_phase0_corrected.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

const EXPECTED_TABLES = [
  'qcr_sources', 'qcr_source_versions', 'qcr_source_field_authorities',
  'qcr_ingestion_runs', 'qcr_provenance_entities', 'qcr_conflict_reconciliations',
  'qcr_knowledge_gaps', 'qcr_canonical_surahs', 'qcr_surah_metadata_variants',
  'qcr_canonical_ayahs', 'qcr_canonical_translations', 'qcr_morphology_tokens'
].sort();
const EXPECTED_VIEWS = [
  'view_active_canonical_ayahs', 'view_opening_basmalas', 'view_sajda_verses'
].sort();

try {
  // STEP-07: Create fresh Shadow DB
  const db = new DatabaseSync(dbPath);
  console.log('STEP07: Shadow DB created at ' + dbPath);

  // STEP-08: Enable foreign keys and verify
  db.exec('PRAGMA foreign_keys = ON');
  const fk = db.prepare('PRAGMA foreign_keys').get();
  const fkVal = fk[Object.keys(fk)[0]];
  console.log('STEP08: PRAGMA foreign_keys = ' + fkVal);
  if (fkVal !== 1) { console.log('STEP08=FAIL'); process.exit(1); }

  // STEP-09: Apply migration
  db.exec(sql);

  // Verify schema
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).sort();
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all().map(r => r.name).sort();

  const missingT = EXPECTED_TABLES.filter(t => !tables.includes(t));
  const unexpectedT = tables.filter(t => !EXPECTED_TABLES.includes(t));
  const missingV = EXPECTED_VIEWS.filter(v => !views.includes(v));

  console.log('SHADOW_TABLES=' + JSON.stringify(tables));
  console.log('SHADOW_VIEWS=' + JSON.stringify(views));
  console.log('MISSING_TABLES=' + JSON.stringify(missingT));
  console.log('UNEXPECTED_TABLES=' + JSON.stringify(unexpectedT));
  console.log('MISSING_VIEWS=' + JSON.stringify(missingV));

  const pass = missingT.length === 0 && unexpectedT.length === 0 && missingV.length === 0;
  console.log('STEP09=' + (pass ? 'PASS' : 'FAIL'));

  db.close();

  // Compute SHA-256 of the new Shadow DB
  const dbBuf = fs.readFileSync(dbPath);
  const dbHash = crypto.createHash('sha256').update(dbBuf).digest('hex').toUpperCase();
  console.log('SHADOW_DB_SHA256=' + dbHash);

  // Migration SHA-256
  const migBuf = fs.readFileSync(migrationPath);
  const migHash = crypto.createHash('sha256').update(migBuf).digest('hex').toUpperCase();
  console.log('MIGRATION_SHA256=' + migHash);

} catch (e) {
  console.error('STEP09=FAIL');
  console.error('ERROR=' + e.message);
}

