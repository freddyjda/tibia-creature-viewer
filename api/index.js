const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const DATA_PATH = path.join(__dirname, "creatures.json");
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const creatures = data.creatures;

function normalizeName(n) {
  return (n || "").trim().toLowerCase();
}

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/servers", (req, res) => {
  res.json(data.servers);
});

app.get("/api/creatures", (req, res) => {
  const { server, search } = req.query;
  let rows = creatures;
  if (server && server !== "all") {
    rows = rows.filter((c) => c.server === server);
  }
  if (search) {
    const q = normalizeName(search);
    rows = rows.filter((c) => normalizeName(c.creature_name).includes(q));
  }
  res.json([...rows].sort((a, b) => (a.creature_name < b.creature_name ? -1 : 1)));
});

app.get("/api/creatures/averages", (req, res) => {
  const { search } = req.query;
  const groups = new Map();
  for (const c of creatures) {
    if (search && !normalizeName(c.creature_name).includes(normalizeName(search))) {
      continue;
    }
    const key = normalizeName(c.creature_name);
    if (!groups.has(key)) {
      groups.set(key, {
        creature_name: c.creature_name,
        hp: c.hp,
        server_count: 0,
        sum_kills_day: 0,
        sum_kills_week: 0,
        sum_players_day: 0,
        sum_players_week: 0,
      });
    }
    const g = groups.get(key);
    g.server_count += 1;
    g.sum_kills_day += c.kills_day || 0;
    g.sum_kills_week += c.kills_week || 0;
    g.sum_players_day += c.players_killed_day || 0;
    g.sum_players_week += c.players_killed_week || 0;
  }
  const out = [];
  for (const g of groups.values()) {
    out.push({
      creature_name: g.creature_name,
      hp: g.hp,
      server_count: g.server_count,
      avg_kills_day: Math.round(g.sum_kills_day / g.server_count),
      avg_kills_week: Math.round(g.sum_kills_week / g.server_count),
      avg_players_day: Math.round(g.sum_players_day / g.server_count),
      avg_players_week: Math.round(g.sum_players_week / g.server_count),
      total_kills_day: g.sum_kills_day,
      total_kills_week: g.sum_kills_week,
      total_players_day: g.sum_players_day,
      total_players_week: g.sum_players_week,
    });
  }
  out.sort((a, b) => b.total_kills_week - a.total_kills_week);
  res.json(out);
});

app.get("/api/stats", (req, res) => {
  const { server } = req.query;
  let rows = creatures;
  if (server && server !== "all") {
    rows = rows.filter((c) => c.server === server);
  }
  let total_kills_day = 0;
  let total_kills_week = 0;
  let total_players_day = 0;
  let total_players_week = 0;
  const names = new Set();
  const servers = new Set();
  for (const c of rows) {
    names.add(normalizeName(c.creature_name));
    servers.add(c.server);
    total_kills_day += c.kills_day || 0;
    total_kills_week += c.kills_week || 0;
    total_players_day += c.players_killed_day || 0;
    total_players_week += c.players_killed_week || 0;
  }
  res.json({
    servers: servers.size,
    creatures: names.size,
    total_kills_day,
    total_kills_week,
    total_players_day,
    total_players_week,
  });
});

app.get("/api/debug", (req, res) => {
  res.json({
    dataPath: DATA_PATH,
    dataExists: fs.existsSync(DATA_PATH),
    creatures: creatures.length,
    servers: data.servers,
    sample: creatures[0] || null,
  });
});

module.exports = app;
