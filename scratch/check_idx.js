const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const sql = fs.readFileSync('d:\\Quran-Data\\governance\\sql\\migration_phase0_corrected.sql', 'utf8');
const db = new DatabaseSync(':memory:');
db.exec(sql);
const idxs = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='qcr_canonical_ayahs'").all();
for (const i of idxs) {
  console.log(i.name + ' -> ' + i.sql);
}
db.close();

