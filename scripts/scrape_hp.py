import json
import os
import sqlite3

import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "parsed", "tibia.db")
CACHE_PATH = os.path.join(BASE_DIR, "data", "parsed", "creatures_api.json")
URL = "https://tibiawiki.dev/api/creatures?expand=true"
HEADERS = {"User-Agent": "Mozilla/5.0 (Tibia-Data-Project; private use)"}


def fetch_json():
    if os.path.exists(CACHE_PATH):
        print(f"Usando cache: {CACHE_PATH}")
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    print(f"Descargando {URL} ...")
    r = requests.get(URL, headers=HEADERS, timeout=120)
    r.raise_for_status()
    data = r.json()
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f)
    print(f"Guardado en cache ({len(data)} criaturas)")
    return data


def create_hp_table(conn):
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS creature_hp (
            creature_name TEXT PRIMARY KEY,
            hp INTEGER
        )
    """)
    conn.commit()


def main():
    data = fetch_json()
    hp_map = {}

    for d in data:
        name = d.get("name")
        hp = d.get("hp")
        if not name:
            continue
        if hp is not None and str(hp).strip().isdigit():
            hp_map[name.strip()] = int(hp)
        else:
            hp_map[name.strip()] = None

    conn = sqlite3.connect(DB_PATH)
    create_hp_table(conn)
    c = conn.cursor()

    c.executemany(
        "INSERT OR REPLACE INTO creature_hp (creature_name, hp) VALUES (?, ?)",
        [(name, hp) for name, hp in hp_map.items()],
    )
    conn.commit()

    c.execute("SELECT COUNT(*) FROM creature_hp WHERE hp IS NOT NULL")
    with_hp = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM creature_hp WHERE hp IS NULL")
    no_hp = c.fetchone()[0]
    print(f"\nResumen HP:")
    print(f"  Total criaturas: {len(hp_map)}")
    print(f"  Con HP: {with_hp}")
    print(f"  Sin HP: {no_hp}")

    # coverage vs creatures table
    c.execute("SELECT DISTINCT creature_name FROM creatures")
    db_names = [x[0] for x in c.fetchall()]
    matched = [n for n in db_names if n in hp_map and hp_map[n] is not None]
    print(f"  Cubiertos en tu DB: {len(matched)}/{len(db_names)}")

    for name in ["Demon", "Adult Goanna", "Acid Blob", "Infernal Demon"]:
        print(f"  {name}: {hp_map.get(name)}")

    conn.close()


if __name__ == "__main__":
    main()
