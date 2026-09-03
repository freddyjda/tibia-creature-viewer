const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = 4892;
const DB_PATH = path.join(__dirname, "data", "parsed", "tibia.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/servers", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT server FROM creatures ORDER BY server").all();
  res.json(rows.map((r) => r.server));
});

app.get("/api/creatures", (req, res) => {
  const { server, search } = req.query;
  let sql = `
    SELECT c.*, h.hp
    FROM creatures c
    LEFT JOIN creature_hp h ON h.creature_name = c.creature_name
    WHERE 1=1
  `;
  const params = [];

  if (server && server !== "all") {
    sql += " AND c.server = ?";
    params.push(server);
  }
  if (search) {
    sql += " AND c.creature_name LIKE ?";
    params.push(`%${search}%`);
  }

  sql += " ORDER BY c.creature_name";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/creatures/averages", (req, res) => {
  const { search } = req.query;
  let sql = `
    SELECT
      c.creature_name,
      h.hp,
      COUNT(DISTINCT c.server) as server_count,
      ROUND(AVG(c.kills_day)) as avg_kills_day,
      ROUND(AVG(c.kills_week)) as avg_kills_week,
      ROUND(AVG(c.players_killed_day)) as avg_players_day,
      ROUND(AVG(c.players_killed_week)) as avg_players_week,
      SUM(c.kills_day) as total_kills_day,
      SUM(c.kills_week) as total_kills_week,
      SUM(c.players_killed_day) as total_players_day,
      SUM(c.players_killed_week) as total_players_week
    FROM creatures c
    LEFT JOIN creature_hp h ON h.creature_name = c.creature_name
  `;

  const params = [];
  if (search) {
    sql += " WHERE c.creature_name LIKE ?";
    params.push(`%${search}%`);
  }

  sql += `
    GROUP BY c.creature_name
    ORDER BY avg_kills_week DESC
  `;

  res.json(db.prepare(sql).all(...params));
});

app.get("/api/stats", (req, res) => {
  const { server } = req.query;
  let where = "";
  const params = [];

  if (server && server !== "all") {
    where = "WHERE server = ?";
    params.push(server);
  }

  const row = db.prepare(`
    SELECT
      COUNT(DISTINCT server) as servers,
      COUNT(DISTINCT creature_name) as creatures,
      SUM(kills_day) as total_kills_day,
      SUM(kills_week) as total_kills_week,
      SUM(players_killed_day) as total_players_day,
      SUM(players_killed_week) as total_players_week
    FROM creatures ${where}
  `).get(...params);

  res.json(row);
});

app.listen(PORT, () => {
  console.log(`Tibia Viewer: http://localhost:${PORT}`);
});
