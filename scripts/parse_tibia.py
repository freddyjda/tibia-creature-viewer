import sqlite3
import os
import glob
import sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
DB_PATH = os.path.join(BASE_DIR, "data", "parsed", "tibia.db")


def create_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS creatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creature_name TEXT NOT NULL,
            server TEXT NOT NULL,
            kills_day INTEGER DEFAULT 0,
            kills_week INTEGER DEFAULT 0,
            players_killed_day INTEGER DEFAULT 0,
            players_killed_week INTEGER DEFAULT 0,
            import_date TEXT NOT NULL,
            UNIQUE(creature_name, server)
        )
    """)
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_creatures_server
        ON creatures(server)
    """)
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_creatures_name
        ON creatures(creature_name)
    """)
    conn.commit()
    return conn


def clean_number(s):
    s = s.strip().replace(",", "").replace(".", "")
    if not s or s == "":
        return 0
    try:
        return int(s)
    except ValueError:
        return 0


def parse_file(filepath):
    server_name = os.path.splitext(os.path.basename(filepath))[0]
    rows = []

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")

        if len(parts) < 5:
            continue

        creature = parts[0].strip()
        if not creature or creature in ("Raza", "Muertos", "Muertos por"):
            continue

        players_day = clean_number(parts[1])
        kills_day = clean_number(parts[2])
        players_week = clean_number(parts[3])
        kills_week = clean_number(parts[4])

        if creature == "players":
            creature = "Players"

        rows.append((creature, server_name, kills_day, kills_week, players_day, players_week))

    return rows, server_name


def import_all():
    conn = create_db()
    c = conn.cursor()
    now = datetime.now().isoformat()

    txt_files = glob.glob(os.path.join(RAW_DIR, "*.txt"))
    if not txt_files:
        print(f"No se encontraron archivos .txt en {RAW_DIR}")
        sys.exit(1)

    total_imported = 0
    for filepath in sorted(txt_files):
        rows, server = parse_file(filepath)
        if not rows:
            print(f"  {server}: 0 registros validos")
            continue

        c.executemany("""
            INSERT OR REPLACE INTO creatures
            (creature_name, server, kills_day, kills_week, players_killed_day, players_killed_week, import_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [(r[0], r[1], r[2], r[3], r[4], r[5], now) for r in rows])

        total_imported += len(rows)
        print(f"  {server}: {len(rows)} criaturas importadas")

    conn.commit()

    c.execute("SELECT COUNT(DISTINCT server) FROM creatures")
    servers = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM creatures")
    total = c.fetchone()[0]

    print(f"\nResumen:")
    print(f"  Servers: {servers}")
    print(f"  Total registros: {total}")
    print(f"  Base de datos: {DB_PATH}")

    conn.close()


def query(sql):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(sql)
    for row in c.fetchall():
        print(dict(row))
    conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "query":
        query(sys.argv[2] if len(sys.argv) > 2 else "SELECT * FROM creatures LIMIT 10")
    else:
        import_all()
