import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const defaultPath = path.join(process.cwd(), "data", "game.sqlite");
const dbPath = process.env.GAME_DB_PATH || defaultPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

const upsertRoom = db.prepare(`
  INSERT INTO rooms (code, data, updated_at)
  VALUES (@code, @data, @updated_at)
  ON CONFLICT(code) DO UPDATE SET
    data = excluded.data,
    updated_at = excluded.updated_at
`);

const deleteRoomStmt = db.prepare("DELETE FROM rooms WHERE code = ?");
const allRoomsStmt = db.prepare("SELECT code, data FROM rooms");

export function loadRooms() {
  const rooms = {};
  for (const row of allRoomsStmt.all()) {
    try {
      rooms[row.code] = JSON.parse(row.data);
    } catch {
      // Ignore corrupt room rows.
    }
  }
  return rooms;
}

export function saveRoom(room) {
  if (!room?.code) return;
  upsertRoom.run({
    code: room.code,
    data: JSON.stringify(room),
    updated_at: Date.now(),
  });
}

export function deleteRoom(code) {
  if (!code) return;
  deleteRoomStmt.run(code);
}
