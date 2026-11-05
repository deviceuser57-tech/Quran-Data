// ==============================================================================
// QCR-OS INVIOLABLE CONTRACT & CANONICAL INTEGRITY VALIDATOR
// Task ID: QCR-OS-GOVERNANCE-BOOTSTRAP-001
// Contract: QCR-OS-MASTER v2.0 / QCR-OS-PHASE-0 v1.0
// Status: EXECUTABLE VALIDATION ENGINE
// ==============================================================================

const fs = require('fs');
const path = require('path');

function validateCanonicalPackage() {
  const canonicalPath = path.resolve('D0_OUTPUT/quran-tier0-canonical-v1.1.json');
  if (!fs.existsSync(canonicalPath)) {
    return { pass: false, error: 'CANONICAL_PACKAGE_MISSING' };
  }

  const raw = fs.readFileSync(canonicalPath, 'utf8');
  const pkg = JSON.parse(raw);
  const surahs = pkg.surahs || [];
  const records = pkg.quran_records || [];

  const checks = [];

  // INV-01: Exactly 114 Surahs
  const surahCountPass = (surahs.length === 114);
  checks.push({ rule: 'INV-01 (Surah count == 114)', pass: surahCountPass, actual: surahs.length });

  // Count Ayahs and Basmalas from quran_records
  let totalCanonicalAyahs = 0;
  let totalOpeningBasmalas = 0;
  let fatihaHasAyah0 = false;
  let fatihaAyah1IsBasmala = false;
  let tawbaHasOpeningBasmala = false;
  let namlAyah30HasBasmala = false;
  let surah95Ayah0Exists = false;
  let surah97Ayah0Exists = false;
  let duplicateKeyFound = false;

  const keySet = new Set();

  for (const r of records) {
    const sNum = r.surah_number;
    const aNum = r.ayah_number;
    const key = `${sNum}:${aNum}:${r.is_opening_basmala ? 'B' : 'V'}`;
    if (keySet.has(key)) {
      duplicateKeyFound = true;
    }
    keySet.add(key);

    if (r.is_opening_basmala) {
      totalOpeningBasmalas++;
      if (sNum === 1) fatihaHasAyah0 = true;
      if (sNum === 9) tawbaHasOpeningBasmala = true;
      if (sNum === 95 && aNum === 0) surah95Ayah0Exists = true;
      if (sNum === 97 && aNum === 0) surah97Ayah0Exists = true;
    } else {
      totalCanonicalAyahs++;
      if (sNum === 1 && aNum === 1) {
        fatihaAyah1IsBasmala = (r.text && r.text.includes('الرَّحْمَـٰنِ الرَّحِيمِ'));
      }
      if (sNum === 27 && aNum === 30) {
        namlAyah30HasBasmala = (r.text && r.text.includes('بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ'));
      }
    }
  }

  // INV-02: Total numbered canonical Ayahs == 6236
  checks.push({ rule: 'INV-02 (Canonical Ayahs == 6236)', pass: totalCanonicalAyahs === 6236, actual: totalCanonicalAyahs });

  // INV-03: Standalone opening Basmalas == 112
  checks.push({ rule: 'INV-03 (Opening Basmalas == 112)', pass: totalOpeningBasmalas === 112, actual: totalOpeningBasmalas });

  // INV-04: Fatiha: 1:1 is Basmala, no 1:0
  checks.push({ rule: 'INV-04 (Fatiha 1:1 is Basmala & no 1:0)', pass: (!fatihaHasAyah0 && fatihaAyah1IsBasmala), actual: { fatihaHasAyah0, fatihaAyah1IsBasmala } });

  // INV-05: Tawba: No opening Basmala
  checks.push({ rule: 'INV-05 (Tawba has no opening Basmala)', pass: !tawbaHasOpeningBasmala, actual: { tawbaHasOpeningBasmala } });

  // INV-06: Naml 27:30 contains Basmala in text
  checks.push({ rule: 'INV-06 (Naml 27:30 contains Basmala)', pass: namlAyah30HasBasmala, actual: { namlAyah30HasBasmala } });

  // INV-07: Surahs 95:0 and 97:0 opening Basmalas exist
  checks.push({ rule: 'INV-07 (Surahs 95:0 and 97:0 exist)', pass: (surah95Ayah0Exists && surah97Ayah0Exists), actual: { surah95Ayah0Exists, surah97Ayah0Exists } });

  // Zero duplicate keys
  checks.push({ rule: 'NO_DUPLICATE_KEYS', pass: !duplicateKeyFound, actual: { duplicateKeyFound } });

  const allPass = checks.every(c => c.pass);
  return { pass: allPass, checks };
}

if (require.main === module) {
  const res = validateCanonicalPackage();
  console.log('Validation results:\n', JSON.stringify(res, null, 2));
}

module.exports = { validateCanonicalPackage };
