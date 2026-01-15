import { nanoid } from "nanoid";
import { buildDeckParts, shuffle, cardValue } from "./utils.js";

export class Game {
  constructor(store = null) {
    /** @type {Record<string, Room>} */
    this.rooms = {};
    this.store = store;
  }

  persistRoom(code) {
    if (!this.store) return;
    const room = this.rooms[code];
    if (room) this.store.saveRoom(room);
  }

  removeRoom(code) {
    if (!this.store) return;
    this.store.deleteRoom(code);
  }

  createRoom({ name, passcode, maxPlayers, minutes }) {
    const code = nanoid(6).toUpperCase();
    const room = {
      code,
      name,
      passcode,
      maxPlayers: Number(maxPlayers),
      minutes: Number(minutes),
      hostId: null,
      started: false,
      endsAt: null,
      players: {}, // socketId -> { id, name }
      order: [], // join order
      hands: {}, // socketId -> part[]
      trades: {}, // tradeId -> trade
      market: { offers: {} },
    };
    this.rooms[code] = room;
    this.persistRoom(code);
    return room;
  }

  joinRoom(code, socketId, playerName) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.started) throw new Error("ALREADY_STARTED");
    if (Object.keys(room.players).length >= room.maxPlayers) throw new Error("ROOM_FULL");

    room.players[socketId] = {
      id: socketId,
      name: playerName || "Player",
      connected: true,
      lastSeen: Date.now(),
    };
    room.order.push(socketId);
    if (!room.hostId) room.hostId = socketId;
    this.persistRoom(code);
    return room;
  }

  leaveRoom(code, socketId) {
    const room = this.rooms[code];
    if (!room) return;
    delete room.players[socketId];
    room.order = room.order.filter((id) => id !== socketId);
    delete room.hands[socketId];

    if (room.market?.offers) {
      for (const offer of Object.values(room.market.offers)) {
        if (offer.fromId === socketId && offer.status === "open") {
          offer.status = "cancelled";
        }
        if (Array.isArray(offer.requests)) {
          offer.requests.forEach((req) => {
            if (req.fromId === socketId && req.status === "pending") {
              req.status = "declined";
            }
          });
        }
      }
    }

    if (room.hostId === socketId) room.hostId = room.order[0] || null;

    if (Object.keys(room.players).length === 0) {
      delete this.rooms[code]; // cleanup empty room
      this.removeRoom(code);
      return;
    }
    this.persistRoom(code);
  }

  startGame(code) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.started) throw new Error("ALREADY_STARTED");

    const parts = shuffle(buildDeckParts());
    const playerIds = room.order;

    // fair distribution (some may get +1 if 208 % n !== 0)
    const n = playerIds.length;
    const base = Math.floor(208 / n);
    let remainder = 208 % n;

    let idx = 0;
    for (const pid of playerIds) {
      const take = base + (remainder > 0 ? 1 : 0);
      room.hands[pid] = parts.slice(idx, idx + take);
      idx += take;
      if (remainder > 0) remainder--;
    }

    room.started = true;
    room.endsAt = Date.now() + room.minutes * 60 * 1000;
    this.persistRoom(code);
    return { room, endsAt: room.endsAt };
  }

  // --- Trading ---
  createTrade(code, fromId, toId, offerPartIds = [], requestPartIds = []) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (!room.started) throw new Error("NOT_STARTED");
    const tradeId = nanoid(8);
    room.trades[tradeId] = { id: tradeId, fromId, toId, offerPartIds, requestPartIds, status: "proposed" };
    this.persistRoom(code);
    return room.trades[tradeId];
  }

  acceptTrade(code, tradeId) {
    const room = this.rooms[code];
    const trade = room?.trades?.[tradeId];
    if (!trade || trade.status !== "proposed") throw new Error("TRADE_NOT_FOUND");

    const { fromId, toId, offerPartIds, requestPartIds } = trade;
    const fromHand = room.hands[fromId] || [];
    const toHand = room.hands[toId] || [];

    const takeFrom = new Set(offerPartIds);
    const takeTo = new Set(requestPartIds);

    // move parts
    room.hands[fromId] = fromHand.filter((p) => {
      if (takeFrom.has(p.partId)) {
        toHand.push(p);
        return false;
      }
      return true;
    });

    room.hands[toId] = toHand.filter((p) => {
      if (takeTo.has(p.partId)) {
        (room.hands[fromId] || []).push(p);
        return false;
      }
      return true;
    });

    trade.status = "accepted";
    this.persistRoom(code);
    return trade;
  }

  cancelTrade(code, tradeId) {
    const room = this.rooms[code];
    const trade = room?.trades?.[tradeId];
    if (!trade) return;
    trade.status = "cancelled";
    this.persistRoom(code);
  }

  // --- Market trading ---
  hasParts(room, playerId, partIds = []) {
    if (!partIds.length) return true;
    const hand = room.hands[playerId] || [];
    const set = new Set(hand.map((p) => p.partId));
    return partIds.every((id) => set.has(id));
  }

  swapParts(room, fromId, toId, fromPartIds = [], toPartIds = []) {
    if (!this.hasParts(room, fromId, fromPartIds)) throw new Error("PARTS_UNAVAILABLE");
    if (!this.hasParts(room, toId, toPartIds)) throw new Error("PARTS_UNAVAILABLE");

    const fromHand = room.hands[fromId] || [];
    const toHand = room.hands[toId] || [];
    const fromSet = new Set(fromPartIds);
    const toSet = new Set(toPartIds);
    const movedFrom = [];
    const movedTo = [];

    room.hands[fromId] = fromHand.filter((p) => {
      if (fromSet.has(p.partId)) {
        movedFrom.push(p);
        return false;
      }
      return true;
    });

    room.hands[toId] = toHand.filter((p) => {
      if (toSet.has(p.partId)) {
        movedTo.push(p);
        return false;
      }
      return true;
    });

    room.hands[fromId].push(...movedTo);
    room.hands[toId].push(...movedFrom);
  }

  createMarketOffer(code, fromId, offerPartIds = [], requestPartIds = []) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (!room.started) throw new Error("NOT_STARTED");

    const offerIds = Array.from(new Set(offerPartIds));
    const requestIds = Array.from(new Set(requestPartIds));
    if (offerIds.length === 0) throw new Error("EMPTY_OFFER");
    if (!this.hasParts(room, fromId, offerIds)) throw new Error("PARTS_UNAVAILABLE");

    const offerId = nanoid(8);
    const offer = {
      id: offerId,
      fromId,
      offerPartIds: offerIds,
      requestPartIds: requestIds,
      status: "open",
      createdAt: Date.now(),
      requests: [],
    };
    room.market.offers[offerId] = offer;
    this.persistRoom(code);
    return offer;
  }

  cancelMarketOffer(code, offerId, fromId) {
    const room = this.rooms[code];
    const offer = room?.market?.offers?.[offerId];
    if (!offer) throw new Error("OFFER_NOT_FOUND");
    if (offer.fromId !== fromId) throw new Error("NOT_YOUR_OFFER");
    offer.status = "cancelled";
    if (Array.isArray(offer.requests)) {
      offer.requests.forEach((req) => {
        if (req.status === "pending") req.status = "declined";
      });
    }
    this.persistRoom(code);
    return offer;
  }

  createMarketRequest(code, offerId, fromId, offerPartIds = []) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (!room.started) throw new Error("NOT_STARTED");

    const offer = room.market?.offers?.[offerId];
    if (!offer || offer.status !== "open") throw new Error("OFFER_NOT_FOUND");
    if (offer.fromId === fromId) throw new Error("CANNOT_REQUEST_OWN");

    let requestIds = Array.from(new Set(offerPartIds));
    if (offer.requestPartIds.length > 0) {
      const offerSet = new Set(offer.requestPartIds);
      if (requestIds.length === 0) requestIds = [...offerSet];
      const same =
        requestIds.length === offerSet.size &&
        requestIds.every((id) => offerSet.has(id));
      if (!same) throw new Error("REQUEST_MISMATCH");
    }
    if (requestIds.length === 0) throw new Error("EMPTY_REQUEST");
    if (!this.hasParts(room, fromId, requestIds)) throw new Error("PARTS_UNAVAILABLE");

    const existing = (offer.requests || []).find(
      (req) => req.fromId === fromId && req.status === "pending"
    );
    if (existing) throw new Error("ALREADY_REQUESTED");

    const request = {
      id: nanoid(8),
      offerId,
      fromId,
      offerPartIds: requestIds,
      status: "pending",
      createdAt: Date.now(),
    };
    offer.requests = offer.requests || [];
    offer.requests.push(request);
    this.persistRoom(code);
    return request;
  }

  acceptMarketRequest(code, offerId, requestId, ownerId) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const offer = room.market?.offers?.[offerId];
    if (!offer || offer.status !== "open") throw new Error("OFFER_NOT_FOUND");
    if (offer.fromId !== ownerId) throw new Error("NOT_YOUR_OFFER");

    const request = (offer.requests || []).find((r) => r.id === requestId);
    if (!request || request.status !== "pending") throw new Error("REQUEST_NOT_FOUND");

    this.swapParts(room, ownerId, request.fromId, offer.offerPartIds, request.offerPartIds);

    offer.status = "closed";
    request.status = "accepted";
    offer.requests.forEach((req) => {
      if (req.id !== requestId && req.status === "pending") req.status = "declined";
    });
    this.persistRoom(code);
    return { offer, request };
  }

  declineMarketRequest(code, offerId, requestId, ownerId) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const offer = room.market?.offers?.[offerId];
    if (!offer) throw new Error("OFFER_NOT_FOUND");
    if (offer.fromId !== ownerId) throw new Error("NOT_YOUR_OFFER");

    const request = (offer.requests || []).find((r) => r.id === requestId);
    if (!request || request.status !== "pending") throw new Error("REQUEST_NOT_FOUND");
    request.status = "declined";
    this.persistRoom(code);
    return request;
  }

  // --- Scoring ---
  getLiveScore(code) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const playerScores = [];
    
    for (const pid of room.order) {
      const player = room.players[pid];
      if (!player) continue;

      const parts = room.hands[pid] || [];
      const byCard = parts.reduce((acc, p) => {
        acc[p.cardId] = acc[p.cardId] || [];
        acc[p.cardId].push(p);
        return acc;
      }, {});

      const completed = Object.entries(byCard)
        .filter(([, arr]) => arr.length === 4)
        .map(([cardId, arr]) => ({ cardId, rank: arr[0].rank, suit: arr[0].suit }));

      const totalCards = completed.length;
      const bonuses = [];
      let bonusPoints = 0;

      // Same Rank Bonus: Four of same rank = +4
      const rankCounts = completed.reduce((acc, c) => {
        acc[c.rank] = (acc[c.rank] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(rankCounts).forEach(([rank, count]) => {
        if (count === 4) {
          if (rank === '7') {
            // Lucky 7s: +7 instead of +4
            bonuses.push({ type: 'Lucky 7s', points: 7, desc: 'Four 7s (all suits)' });
            bonusPoints += 7;
          } else {
            bonuses.push({ type: 'Same Rank', points: 4, desc: `Four ${rank}s (all suits)` });
            bonusPoints += 4;
          }
        }
      });

      // Sequence Bonus: 5 consecutive ranks = +10
      // TODO: Implement sequence detection

      // Color Bonus: 6+ same color = +6
      const redCards = completed.filter(c => c.suit === '♥' || c.suit === '♦').length;
      const blackCards = completed.filter(c => c.suit === '♠' || c.suit === '♣').length;
      if (redCards >= 6) {
        bonuses.push({ type: 'Color Bonus', points: 6, desc: `${redCards} red cards` });
        bonusPoints += 6;
      }
      if (blackCards >= 6) {
        bonuses.push({ type: 'Color Bonus', points: 6, desc: `${blackCards} black cards` });
        bonusPoints += 6;
      }

      // Trading Master: TODO - need to track part origins
      // Speed Bonus: TODO - need to track first card completion time

      const totalPoints = totalCards + bonusPoints;
      const uselessParts = parts.length - (totalCards * 4);

      playerScores.push({
        playerId: pid,
        playerName: player.name,
        totalCards,
        bonuses,
        bonusPoints,
        totalPoints,
        uselessParts,
        connected: player.connected
      });
    }

    // Sort by total points
    playerScores.sort((a, b) => b.totalPoints - a.totalPoints);

    return { leaderboard: playerScores, timestamp: Date.now() };
  }

  scoreRoom(code) {
    const room = this.rooms[code];
    if (!room) throw new Error("ROOM_NOT_FOUND");

    // Build per-player completed cards and values
    const playerScores = {};
    for (const pid of Object.keys(room.players)) {
      const parts = room.hands[pid] || [];
      const byCard = parts.reduce((acc, p) => {
        acc[p.cardId] = acc[p.cardId] || [];
        acc[p.cardId].push(p);
        return acc;
      }, {});

      const completed = Object.entries(byCard)
        .filter(([, arr]) => arr.length === 4)
        .map(([cardId, arr]) => ({ cardId, rank: arr[0].rank, suit: arr[0].suit }));

      const totalCards = completed.length;
      const uselessParts = parts.length - (totalCards * 4);
      
      const sameNumberMap = completed.reduce((acc, c) => {
        acc[c.rank] = (acc[c.rank] || 0) + 1;
        return acc;
      }, {});
      // Bonus: +1 if a player/team completes all four suits of any same rank
      const bonus = Object.values(sameNumberMap).some((cnt) => cnt === 4) ? 1 : 0;

      const valueSum = completed.reduce((sum, c) => sum + cardValue(c.rank), 0);
      playerScores[pid] = {
        playerId: pid,
        playerName: room.players[pid]?.name || 'Player',
        connected: room.players[pid]?.connected !== false,
        completedCards: completed,
        totalCards,
        uselessParts,
        bonuses: [],
        bonus,
        valueSum,
        totalPoints: totalCards + bonus,
        totalWithBonus: totalCards + bonus,
      };
    }

    // Determine winner(s): max totalWithBonus, then tie-breaker on valueSum
    const entries = Object.values(playerScores);
    entries.sort((a, b) => {
      if (b.totalWithBonus !== a.totalWithBonus) return b.totalWithBonus - a.totalWithBonus;
      return b.valueSum - a.valueSum; // tie-breaker
    });

    const winner = entries[0] || null;
    return { winner, leaderboard: entries };
  }
}
