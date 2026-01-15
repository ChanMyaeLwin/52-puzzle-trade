// Card helpers
export const SUITS = ["♠", "♥", "♦", "♣"]; // display only
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}`, rank, suit });
    }
  }
  return deck; // 52
}

// Each card splits into 4 parts (TL, TR, BL, BR)
export function buildDeckParts() {
  const parts = [];
  for (const { id, rank, suit } of buildDeck()) {
    ["TL", "TR", "BL", "BR"].forEach((pos) => {
      parts.push({ partId: `${id}:${pos}`, cardId: id, pos, rank, suit });
    });
  }
  return parts; // 208
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function cardValue(rank) {
  if (rank === "A") return 1;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  if (rank === "K") return 13;
  return parseInt(rank, 10); // 2–10
}