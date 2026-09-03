const $ = (sel) => document.querySelector(sel);

let currentView = "server";
let currentSort = { col: "creature_name", dir: "asc" };
let allData = [];

const SERVER_COLS = [
  { key: "creature_name", label: "Criatura" },
  { key: "server", label: "Server" },
  { key: "hp", label: "HP", numeric: true },
  { key: "players_killed_day", label: "Players Dia" },
  { key: "kills_day", label: "Kills Dia" },
  { key: "players_killed_week", label: "Players Semana" },
  { key: "kills_week", label: "Kills Semana" },
];

const AVG_COLS = [
  { key: "creature_name", label: "Criatura" },
  { key: "server_count", label: "Servers" },
  { key: "hp", label: "HP", numeric: true },
  { key: "total_players_week", label: "Total Players Semana" },
  { key: "total_kills_week", label: "Total Kills Semana" },
  { key: "avg_players_day", label: "Prom. Players Dia" },
  { key: "avg_kills_day", label: "Prom. Kills Dia" },
  { key: "avg_players_week", label: "Prom. Players Semana" },
  { key: "avg_kills_week", label: "Prom. Kills Semana" },
];

function formatNum(n) {
  if (n == null || n === "") return "0";
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return num.toLocaleString("es-ES");
}

function buildHead(cols) {
  const thead = $("#table-head");
  thead.innerHTML = "";
  const tr = document.createElement("tr");
  cols.forEach((c) => {
    const th = document.createElement("th");
    const isSorted = currentSort.col === c.key;
    const arrow = isSorted ? (currentSort.dir === "asc" ? "▲" : "▼") : "▲";
    th.innerHTML = `${c.label} <span class="sort-arrow">${arrow}</span>`;
    if (isSorted) th.classList.add("sorted");
    th.dataset.col = c.key;
    th.addEventListener("click", () => toggleSort(c.key));
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}

function toggleSort(col) {
  if (currentSort.col === col) {
    currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
  } else {
    currentSort.col = col;
    currentSort.dir = "desc";
  }
  renderTable();
}

function getHpFilter() {
  const minRaw = $("#hp-min").value.trim();
  const maxRaw = $("#hp-max").value.trim();
  return {
    min: minRaw === "" ? null : Number(minRaw),
    max: maxRaw === "" ? null : Number(maxRaw),
  };
}

function applyHpFilter(data) {
  const { min, max } = getHpFilter();
  if (min == null && max == null) return data;
  return data.filter((row) => {
    const hp = row.hp;
    if (hp == null) return false; // sin HP no pasa el filtro numerico
    if (min != null && hp < min) return false;
    if (max != null && hp > max) return false;
    return true;
  });
}

function sortData(data) {
  const { col, dir } = currentSort;
  return [...data].sort((a, b) => {
    let va = a[col];
    let vb = b[col];
    if (typeof va === "string") {
      va = va.toLowerCase();
      vb = (vb || "").toLowerCase();
      return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    va = va || 0;
    vb = vb || 0;
    return dir === "asc" ? va - vb : vb - va;
  });
}

function renderTable() {
  const tbody = $("#table-body");
  const filtered = applyHpFilter(allData);
  const sorted = sortData(filtered);

  if (!sorted.length) {
    tbody.innerHTML = "";
    $("#no-data").style.display = "block";
    return;
  }
  $("#no-data").style.display = "none";

  const cols = currentView === "server" ? SERVER_COLS : AVG_COLS;

  tbody.innerHTML = sorted
    .map((row) => {
      const tds = cols
        .map((c) => {
          const isNum = c.numeric || (c.key !== "creature_name" && c.key !== "server");
          const isHighlight =
            c.key === "avg_kills_week" ||
            c.key === "kills_week" ||
            c.key === "avg_players_week" ||
            c.key === "players_killed_week" ||
            c.key === "hp";
          let val;
          if (c.key === "hp" && (row[c.key] == null)) {
            val = "-";
          } else {
            val = isNum ? formatNum(row[c.key]) : (row[c.key] || "");
          }
          return `<td class="${isNum ? "num" : ""}${isHighlight ? " highlight" : ""}">${val}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
}

function updateStats(data) {
  const stats = data.reduce(
    (acc, r) => {
      acc.kills_week += r.kills_week || r.avg_kills_week || 0;
      acc.players_week += r.players_killed_week || r.avg_players_week || 0;
      return acc;
    },
    { kills_week: 0, players_week: 0 }
  );

  $("#stat-kills-week").textContent = formatNum(stats.kills_week);
  $("#stat-players-week").textContent = formatNum(stats.players_week);
}

async function loadServers() {
  const res = await fetch("/api/servers");
  const servers = await res.json();
  const sel = $("#server-filter");
  servers.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
  $("#stat-servers").textContent = servers.length;
}

async function loadStats(server) {
  const url = server === "all" ? "/api/stats" : `/api/stats?server=${server}`;
  const res = await fetch(url);
  const s = await res.json();
  $("#stat-creatures").textContent = s.creatures;
}

async function loadData() {
  const server = $("#server-filter").value;
  const search = $("#search").value.trim();
  const loading = $("#loading");
  loading.style.display = "block";

  if (currentView === "avg") {
    const url = search
      ? `/api/creatures/averages?search=${encodeURIComponent(search)}`
      : "/api/creatures/averages";
    const res = await fetch(url);
    allData = await res.json();
  } else {
    const params = new URLSearchParams();
    if (server !== "all") params.set("server", server);
    if (search) params.set("search", search);
    const res = await fetch(`/api/creatures?${params}`);
    allData = await res.json();
  }

  const cols = currentView === "server" ? SERVER_COLS : AVG_COLS;
  buildHead(cols);
  renderTable();
  updateStats(allData);
  loadStats(server);
  loading.style.display = "none";
}

$("#server-filter").addEventListener("change", loadData);

let debounce;
$("#search").addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(loadData, 300);
});

["hp-min", "hp-max"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const cols = currentView === "server" ? SERVER_COLS : AVG_COLS;
      buildHead(cols);
      renderTable();
    }, 300);
  });
});

$("#btn-view").addEventListener("click", () => {
  currentView = "server";
  currentSort = { col: "creature_name", dir: "asc" };
  $("#btn-view").classList.add("active");
  $("#btn-avg").classList.remove("active");
  loadData();
});

$("#btn-avg").addEventListener("click", () => {
  currentView = "avg";
  currentSort = { col: "creature_name", dir: "asc" };
  $("#btn-avg").classList.add("active");
  $("#btn-view").classList.remove("active");
  loadData();
});

loadServers();
loadData();
