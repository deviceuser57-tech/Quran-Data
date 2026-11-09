const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = 'd:\\Quran-Data\\governance\\sql\\migration_step5_6_corrected.sql';
const sql = fs.readFileSync(path, 'utf8');
const db = new DatabaseSync(':memory:');
try {
  db.exec(sql);
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');
  const fk = db.prepare('PRAGMA foreign_keys').get();
  console.log('FK pragma result:', fk);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all().map(r=>r.name);
  console.log('Tables:', JSON.stringify(tables,null,2));
  console.log('Views:', JSON.stringify(views,null,2));
} catch(e){
  console.error('Error during migration exec:', e.message);
}

