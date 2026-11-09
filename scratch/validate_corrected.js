const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const sql = fs.readFileSync('d:\\Quran-Data\\governance\\sql\\migration_step5_6_corrected.sql','utf8');
const db = new DatabaseSync(':memory:');
try {
  db.exec(sql);
  db.exec('PRAGMA foreign_keys = ON');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all().map(r=>r.name);
  const fk = db.prepare('PRAGMA foreign_keys').get();
  console.log('PASS');
  console.log('Tables:', JSON.stringify(tables));
  console.log('Views:', JSON.stringify(views));
  console.log('FK:', JSON.stringify(fk));
} catch(e){
  console.error('FAIL');
  console.error(e.message);
}

