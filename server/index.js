import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { Game } from "./game.js";
import { loadRooms, saveRoom, deleteRoom } from "./storage.js";

const app = express();
app.use(cors());
app.get("/health", (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Our in-memory game state (rooms live here), persisted to SQLite
const game = new Game({ saveRoom, deleteRoom });
game.rooms = loadRooms();
for (const room of Object.values(game.rooms)) {
  room.players = room.players || {};
  room.order = room.order || [];
  room.hands = room.hands || {};
  room.trades = room.trades || {};
  room.market = room.market || { offers: {} };
}

// helper: normalize room codes
const normCode = (s) => String(s || "").trim().toUpperCase();

io.on("connection", (socket) => {
  // --- Create room ---
  socket.on("room:create", (payload, cb) => {
    try {
      const { name, passcode, maxPlayers, minutes } = payload;
      const room = game.createRoom({ name, passcode, maxPlayers, minutes });
      console.log("[CREATE]", room.code, "name:", room.name);
      cb({ ok: true, code: room.code });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  // --- Join room ---
  socket.on("room:join", ({ code, passcode, playerName }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      if (!room) throw new Error("ROOM_NOT_FOUND");

      // passcode check (if set)
      if (room.passcode && room.passcode !== passcode) {
        throw new Error("BAD_PASSCODE");
      }

      // prevent duplicate names (case-insensitive)
      const cleanName = String(playerName || "Player").trim();
      const exists = Object.values(room.players).some(
        (p) => String(p?.name || "").trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (exists) throw new Error("NAME_TAKEN");

      game.joinRoom(code, socket.id, cleanName);
      socket.join(code);
      io.to(code).emit("room:state", publicRoomState(code));
      io.to(code).emit("market:state", marketState(code));
      cb({ ok: true, code, me: socket.id });
      console.log("[JOIN]", code, "players:", Object.keys(room.players).length);
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  // --- Get current state (supports refresh/direct link) ---
  socket.on("room:state:get", ({ code }, cb) => {
    code = normCode(code);
    const s = publicRoomState(code);
    if (cb) cb(s);
    io.to(socket.id).emit("room:state", s);
    io.to(socket.id).emit("hands:update", maskedHands(code));
    io.to(socket.id).emit("market:state", marketState(code));
  });

  // --- Get current hands snapshot (for late join to /game view or refresh) ---
  socket.on("hands:get", ({ code }, cb) => {
    try {
      code = normCode(code);
      const h = maskedHands(code);
      if (cb) cb({ ok: true, hands: h });
      // also send to just this socket
      io.to(socket.id).emit("hands:update", h);
      io.to(socket.id).emit("market:state", marketState(code));
    } catch (e) {
      if (cb) cb({ ok: false, error: e.message });
    }
  });

  // --- Rebind player to new socket id (handles refresh/HMR) ---
  socket.on("player:rebind", ({ code, oldId }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      if (!room) throw new Error("ROOM_NOT_FOUND");
      if (!oldId || oldId === socket.id) throw new Error("BAD_OLD_ID");

      const oldHand = room.hands[oldId];
      const hadHand = Array.isArray(oldHand) && oldHand.length > 0;

      // Move hand to new id
      if (hadHand) {
        room.hands[socket.id] = (room.hands[socket.id] || []).concat(oldHand);
        delete room.hands[oldId];
      }

      // Migrate player identity if present
      if (room.players[oldId]) {
        room.players[socket.id] = {
          ...room.players[oldId],
          id: socket.id,
          connected: true,
          lastSeen: Date.now(),
        };
        delete room.players[oldId];
      }

      if (room.market?.offers) {
        for (const offer of Object.values(room.market.offers)) {
          if (offer.fromId === oldId) offer.fromId = socket.id;
          if (Array.isArray(offer.requests)) {
            offer.requests.forEach((req) => {
              if (req.fromId === oldId) req.fromId = socket.id;
            });
          }
        }
      }

      // Update order and host if needed
      if (room.order && Array.isArray(room.order)) {
        room.order = room.order.map(id => (id === oldId ? socket.id : id));
      }
      if (room.hostId === oldId) {
        room.hostId = socket.id;
      }

      // Put the new socket in the room if not already
      try { socket.join(code); } catch {}

      // Broadcast updates
      io.to(code).emit("hands:update", maskedHands(code));
      io.to(code).emit("room:state", publicRoomState(code));
      io.to(code).emit("market:state", marketState(code));

      cb && cb({ ok: true, movedHand: hadHand ? oldHand.length : 0 });
      console.log("[REBIND]", code, oldId, "→", socket.id, hadHand ? "(moved hand)" : "");
      game.persistRoom(code);
    } catch (e) {
      cb && cb({ ok: false, error: e.message });
    }
  });

  // --- Leave room ---
  socket.on("room:leave", ({ code }) => {
    code = normCode(code);
    const room = game.rooms[code];
    const wasHost = room?.hostId === socket.id;
    
    game.leaveRoom(code, socket.id);
    socket.leave(code);
    
    // If host left and room still exists, notify everyone and close room
    if (wasHost && game.rooms[code]) {
      io.to(code).emit("room:closed", { message: "Host closed the room" });
      console.log("[HOST_CLOSED]", code);
      // Clean up the room
      delete game.rooms[code];
      game.removeRoom(code);
    } else if (game.rooms[code]) {
      io.to(code).emit("room:state", publicRoomState(code));
      io.to(code).emit("market:state", marketState(code));
    }
    console.log("[LEAVE]", code, socket.id, wasHost ? "(was host)" : "");
  });

  // --- Start game (host only) ---
  socket.on("room:start", ({ code }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      if (!room) throw new Error("ROOM_NOT_FOUND");
      if (room.hostId !== socket.id) throw new Error("ONLY_HOST");

      const { endsAt } = game.startGame(code);
      // DEBUG: log how many parts each player received
      const dealtRoom = game.rooms[code];
      const dealt = Object.fromEntries(dealtRoom.order.map(id => [id, (dealtRoom.hands[id] || []).length]));
      console.log("[DEAL]", code, dealt);
      io.to(code).emit("game:started", { endsAt, hands: maskedHands(code) });
      io.to(code).emit("room:state", publicRoomState(code));
      io.to(code).emit("market:state", marketState(code));
      cb({ ok: true });
      console.log("[START]", code, "endsAt:", new Date(endsAt).toISOString());
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  // --- Trading ---
  socket.on("trade:propose", ({ code, toId, offerPartIds, requestPartIds }, cb) => {
    try {
      code = normCode(code);
      const t = game.createTrade(code, socket.id, toId, offerPartIds, requestPartIds);
      io.to(code).emit("trade:update", { trade: t });
      cb({ ok: true, trade: t });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

 socket.on("trade:accept", ({ code, tradeId }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      const t = room?.trades?.[tradeId];
      if (!t) throw new Error("TRADE_NOT_FOUND");
      if (t.toId !== socket.id) throw new Error("NOT_YOUR_TRADE");
      const updated = game.acceptTrade(code, tradeId);
      io.to(code).emit("trade:update", { trade: updated });
      io.to(code).emit("hands:update", maskedHands(code));
      cb({ ok: true, trade: updated });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  socket.on("trade:cancel", ({ code, tradeId }, cb) => {
    try {
      code = normCode(code);
      game.cancelTrade(code, tradeId);
      io.to(code).emit("trade:cancelled", { tradeId });
      cb({ ok: true });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  // --- Market ---
  socket.on("market:get", ({ code }, cb) => {
    code = normCode(code);
    const state = marketState(code);
    if (cb) cb({ ok: true, market: state });
    io.to(socket.id).emit("market:state", state);
  });

  socket.on("market:offer:create", ({ code, offerPartIds, requestPartIds }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      const playerName = room?.players[socket.id]?.name || 'Player';
      const offer = game.createMarketOffer(code, socket.id, offerPartIds, requestPartIds);
      
      // Format parts for log
      const offerParts = offerPartIds.map(id => {
        const part = room.hands[socket.id]?.find(p => p.partId === id);
        return part ? `${part.rank}${part.suit}${part.pos}` : id;
      }).join(', ');
      
      const wantParts = requestPartIds.length > 0 
        ? requestPartIds.map(id => {
            const part = Object.values(room.hands).flat().find(p => p.partId === id);
            return part ? `${part.rank}${part.suit}${part.pos}` : id;
          }).join(', ')
        : 'any cards';
      
      // Emit activity log
      io.to(code).emit('activity:log', {
        type: 'offer_created',
        message: `${playerName} posted offer: giving [${offerParts}], wants [${wantParts}]`,
        timestamp: Date.now()
      });
      
      io.to(code).emit("market:state", marketState(code));
      cb({ ok: true, offer });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  socket.on("market:offer:cancel", ({ code, offerId }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      const playerName = room?.players[socket.id]?.name || 'Player';
      const offer = game.cancelMarketOffer(code, offerId, socket.id);
      
      // Emit activity log
      io.to(code).emit('activity:log', {
        type: 'offer_cancelled',
        message: `${playerName} cancelled their offer`,
        timestamp: Date.now()
      });
      
      io.to(code).emit("market:state", marketState(code));
      cb({ ok: true, offer });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  socket.on("market:request:create", ({ code, offerId, offerPartIds }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      const playerName = room?.players[socket.id]?.name || 'Player';
      const offer = room?.market?.offers?.[offerId];
      const offerOwnerName = room?.players[offer?.fromId]?.name || 'Player';
      
      const req = game.createMarketRequest(code, offerId, socket.id, offerPartIds);
      
      // Format parts for log
      const givingParts = offerPartIds.map(id => {
        const part = room.hands[socket.id]?.find(p => p.partId === id);
        return part ? `${part.rank}${part.suit}${part.pos}` : id;
      }).join(', ');
      
      const gettingParts = offer?.offerPartIds.map(id => {
        const part = room.hands[offer.fromId]?.find(p => p.partId === id);
        return part ? `${part.rank}${part.suit}${part.pos}` : id;
      }).join(', ') || 'cards';
      
      // Emit activity log
      io.to(code).emit('activity:log', {
        type: 'request_created',
        message: `${playerName} requested ${offerOwnerName}'s offer: giving [${givingParts}] to get [${gettingParts}]`,
        timestamp: Date.now()
      });
      
      io.to(code).emit("market:state", marketState(code));
      cb({ ok: true, request: req });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  socket.on("market:request:accept", ({ code, offerId, requestId }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      const offerOwnerName = room?.players[socket.id]?.name || 'Player';
      const offer = room?.market?.offers?.[offerId];
      const req = offer?.requests?.find(r => r.id === requestId);
      const requesterName = room?.players[req?.fromId]?.name || 'Player';
      
      const { offer: updatedOffer, request } = game.acceptMarketRequest(code, offerId, requestId, socket.id);
      
      // Format parts for log
      const offerParts = offer?.offerPartIds.map(id => {
        const part = room.hands[socket.id]?.find(p => p.partId === id);
        return part ? `${part.rank}${part.suit}${part.pos}` : id;
      }).join(', ') || 'cards';
      
      const requestParts = req?.offerPartIds.map(id => {
        const part = room.hands[req.fromId]?.find(p => p.partId === id);
        return part ? `${part.rank}${part.suit}${part.pos}` : id;
      }).join(', ') || 'cards';
      
      // Emit activity log
      io.to(code).emit('activity:log', {
        type: 'request_accepted',
        message: `${offerOwnerName} accepted ${requesterName}'s request: [${offerParts}] ↔ [${requestParts}]`,
        timestamp: Date.now()
      });
      
      io.to(code).emit("market:state", marketState(code));
      io.to(code).emit("hands:update", maskedHands(code));
      cb({ ok: true, offer: updatedOffer, request });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  socket.on("market:request:decline", ({ code, offerId, requestId }, cb) => {
    try {
      code = normCode(code);
      const room = game.rooms[code];
      const offerOwnerName = room?.players[socket.id]?.name || 'Player';
      const offer = room?.market?.offers?.[offerId];
      const req = offer?.requests?.find(r => r.id === requestId);
      const requesterName = room?.players[req?.fromId]?.name || 'Player';
      
      const request = game.declineMarketRequest(code, offerId, requestId, socket.id);
      
      // Emit activity log
      io.to(code).emit('activity:log', {
        type: 'request_declined',
        message: `${offerOwnerName} declined ${requesterName}'s request`,
        timestamp: Date.now()
      });
      
      io.to(code).emit("market:state", marketState(code));
      cb({ ok: true, request });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  // --- Scoring ---
  socket.on("game:score", ({ code }, cb) => {
    try {
      code = normCode(code);
      const result = game.scoreRoom(code);
      io.to(code).emit("game:result", result);
      cb({ ok: true, result });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  // --- Live Leaderboard ---
  socket.on("game:liveScore", ({ code }, cb) => {
    try {
      code = normCode(code);
      const result = game.getLiveScore(code);
      cb({ ok: true, ...result });
    } catch (e) {
      cb({ ok: false, error: e.message });
    }
  });

  // --- Disconnect cleanup ---
  socket.on("disconnect", () => {
    for (const code of Object.keys(game.rooms)) {
      const room = game.rooms[code];
      if (room.players[socket.id]) {
        const wasHost = room.hostId === socket.id;
        
        room.players[socket.id].connected = false;
        room.players[socket.id].lastSeen = Date.now();
        
        // If host disconnects during game, notify and close room after 30 seconds
        if (wasHost && room.started) {
          setTimeout(() => {
            if (game.rooms[code] && !room.players[socket.id]?.connected) {
              io.to(code).emit("room:closed", { message: "Host disconnected - room closed" });
              console.log("[HOST_DC_TIMEOUT]", code);
              delete game.rooms[code];
              game.removeRoom(code);
            }
          }, 30000); // 30 second grace period
        }
        
        io.to(code).emit("room:state", publicRoomState(code));
        io.to(code).emit("market:state", marketState(code));
        game.persistRoom(code);
        console.log("[DC]", code, socket.id, wasHost ? "(host)" : "");
      }
    }
  });
});

// Optional: see active room codes in the browser at /rooms
app.get("/rooms", (_, res) => {
  res.json(Object.keys(game.rooms));
});

function publicRoomState(code) {
  const room = game.rooms[code];
  if (!room) return null;
  return {
    code: room.code,
    name: room.name,
    minutes: room.minutes,
    maxPlayers: room.maxPlayers,
    hostId: room.hostId,
    started: room.started,
    endsAt: room.endsAt,
    passcode: room.passcode || "", // expose passcode for lobby
    players: room.order.map((id) => ({ id, name: room.players[id]?.name || "?" })),
  };
}

function maskedHands(code) {
  const room = game.rooms[code];
  if (!room) return {};
  // server sends all hands; clients show only their own
  return room.hands;
}

function marketState(code) {
  const room = game.rooms[code];
  if (!room) return { offers: {} };
  return room.market || { offers: {} };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on :${PORT}`));
