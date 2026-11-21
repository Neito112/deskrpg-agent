const Database = require('better-sqlite3');
const db = new Database('data/deskrpg.db');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  if (t.name.includes('gateway') || t.name.includes('hermes') || t.name.includes('npc')) {
    console.log(t.name, '-->', t.sql);
  }
}
