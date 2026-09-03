const path = require("path");
const fs = require("fs");

module.exports = (req, res) => {
  try {
    const out = {};
    const dbPath = path.join(__dirname, "..", "data", "parsed", "tibia.db");
    out.dbPath = dbPath;
    out.dbExists = fs.existsSync(dbPath);
    if (out.dbExists) {
      out.dbSize = fs.statSync(dbPath).size;
    }
    try {
      const Database = require("better-sqlite3");
      out.betterSqlite3Loaded = true;
      try {
        const db = new Database(dbPath, { readonly: true });
        out.count = db.prepare("SELECT COUNT(*) c FROM creatures").get().c;
        out.queryWorks = true;
      } catch (e) {
        out.queryWorks = false;
        out.queryError = e.message;
      }
    } catch (e) {
      out.betterSqlite3Loaded = false;
      out.betterSqlite3Error = e.message;
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
};
