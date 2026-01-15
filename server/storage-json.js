import fs from "fs";
import path from "path";

const defaultPath = path.join(process.cwd(), "data", "rooms.json");
const dbPath = process.env.GAME_DB_PATH || defaultPath;

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Initialize file if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({}), "utf8");
}

let rooms = {};
let saveTimeout = null;

// Load rooms from file
function loadFromFile() {
  try {
    const data = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("[STORAGE] Error loading rooms:", err.message);
    return {};
  }
}

// Save rooms to file (debounced)
function saveToFile() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(rooms, null, 2), "utf8");
      console.log("[STORAGE] Saved", Object.keys(rooms).length, "rooms");
    } catch (err) {
      console.error("[STORAGE] Error saving rooms:", err.message);
    }
  }, 1000); // Debounce 1 second
}

export function loadRooms() {
  rooms = loadFromFile();
  console.log("[STORAGE] Loaded", Object.keys(rooms).length, "rooms");
  return rooms;
}

export function saveRoom(room) {
  if (!room?.code) return;
  rooms[room.code] = room;
  saveToFile();
}

export function deleteRoom(code) {
  if (!code) return;
  delete rooms[code];
  saveToFile();
}
