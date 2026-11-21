export const layouts = [
  [
    "Sa.#..",
    ".#....",
    ".bA..#",
    "..#...",
    "Bc..CH",
  ],
  [
    "....CH",
    "..#B..",
    "Sa..#.",
    ".#Abc.",
    "......",
  ],
  [
    "...BCH",
    ".#...#",
    "a.b.c.",
    "SA.#..",
    "......",
  ],
];

export const parcels = [
  { pickup: "a", drop: "A", icon: "🧦", label: "Emergency sock" },
  { pickup: "b", drop: "B", icon: "🫖", label: "Tiny teapot" },
  { pickup: "c", drop: "C", icon: "🪩", label: "Emergency disco ball" },
];

export function boardForDay(day) {
  const index = ((day % 12) + 12) % 12;
  const base = layouts[index % layouts.length];
  const variant = Math.floor(index / layouts.length);
  let rows = variant & 2 ? [...base].reverse() : base;
  if (variant & 1) rows = rows.map((row) => [...row].reverse().join(""));
  const tiles = rows.join("");
  return { tiles, width: rows[0].length, start: tiles.indexOf("S"), budget: 16 };
}

export function classify(board, route) {
  const steps = route.map((tile) => board.tiles[tile]);
  const delivered = parcels.filter(({ pickup, drop }) => {
    const source = steps.indexOf(pickup);
    return source !== -1 && steps.indexOf(drop) > source;
  });
  return { delivered, home: steps.at(-1) === "H", moves: route.length - 1 };
}

export function canMove(board, route, target) {
  if (!Number.isInteger(target) || target < 0 || target >= board.tiles.length) return false;
  if (board.tiles[target] === "#" || route.includes(target) || route.length > board.budget) return false;
  const current = route.at(-1);
  const distance = Math.abs((current % board.width) - (target % board.width))
    + Math.abs(Math.floor(current / board.width) - Math.floor(target / board.width));
  return board.tiles[current] !== "H" && distance === 1;
}

export function sampleDay(now = new Date()) {
  return Math.floor(now.getTime() / 86400000);
}



export function validHandoff(board, route, tile) {
  if (!Array.isArray(route) || route[0] !== board.start || route.length > board.budget + 1) return false;
  if (!Number.isInteger(tile) || board.tiles[tile] !== "." || !route.includes(tile)) return false;
  for (let i = 1; i < route.length; i++) {
    if (!canMove(board, route.slice(0, i), route[i])) return false;
  }
  const { delivered, home } = classify(board, route);
  return home && delivered.length === parcels.length;
}
