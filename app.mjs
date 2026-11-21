import { boardForDay, canMove, classify, parcels, sampleDay, validHandoff } from "./game.mjs";

const day = sampleDay();
const board = boardForDay(day);
const map = document.querySelector("#board");
const status = document.querySelector("#status");
const steps = document.querySelector("#steps");
const undo = document.querySelector("#undo");
const restart = document.querySelector("#restart");
const share = document.querySelector("#share");
const shareResult = document.querySelector("#share-result");
const storageKey = "pigeon-shift/" + day;
const revealHint = document.querySelector("#reveal-hint");
const leaveHint = document.querySelector("#leave-hint");
const hintTile = document.querySelector("#hint-tile");
const hintStatus = document.querySelector("#hint-status");
const practice = ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("practice");
const practiceKey = storageKey + "/practice-clue";
const revealedKey = storageKey + "/revealed-clue";
let shownHint = readClue(revealedKey);
let route = restore();

function readClue(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Number.isInteger(value) && board.tiles[value] === "." ? value : null;
  } catch {
    return null;
  }
}

function tileLabel(tile) {
  return "Row " + (Math.floor(tile / board.width) + 1) + ", column " + (tile % board.width + 1);
}

document.querySelector("#date").textContent = new Intl.DateTimeFormat("en", {
  month: "long", day: "numeric", weekday: "long", timeZone: "UTC",
}).format(new Date(day * 86400000)) + " · Daily delivery";

const cells = Array.from(board.tiles, (tile, index) => {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "tile";
  const parcel = parcels.find(({ pickup, drop }) => pickup === tile || drop === tile);
  if (parcel) {
    cell.textContent = parcel.icon;
    cell.dataset.kind = parcel.pickup === tile ? "parcel" : "drop";
    cell.title = parcel.label + (parcel.pickup === tile ? " pickup" : " delivery");
  } else {
    cell.textContent = ({ S: "↗", H: "⌂", "#": "✕" })[tile] ?? "·";
    cell.dataset.kind = ({ S: "start", H: "home", "#": "closed" })[tile] ?? "street";
    cell.title = ({ S: "Dispatch", H: "Home rooftop", "#": "Closed street" })[tile] ?? "Street";
  }
  cell.setAttribute("aria-label", cell.title + ", row " + (1 + Math.floor(index / board.width)) + ", column " + (1 + index % board.width));
  cell.addEventListener("click", () => move(index));
  map.append(cell);
  return cell;
});

const checklist = document.querySelector("#parcels");
const items = parcels.map((parcel) => {
  const item = document.createElement("li");
  checklist.append(item);
  return item;
});

function restore() {
  const valid = [board.start];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved[0] === board.start) {
      for (const next of saved.slice(1)) {
        if (!canMove(board, valid, next)) break;
        valid.push(next);
      }
    }
  } catch {
    return valid;
  }
  return valid;
}

function render() {
  const result = classify(board, route);
  const current = route.at(-1);
  const available = cells.map((_, index) => canMove(board, route, index));
  cells.forEach((cell, index) => {
    cell.classList.toggle("current", index === current);
    cell.classList.toggle("used", index !== current && route.includes(index));
    cell.classList.toggle("available", available[index]);
    cell.classList.toggle("clue", index === shownHint);
    cell.setAttribute("aria-description", index === shownHint ? "Courier hint" : "");
    cell.disabled = !available[index];
    cell.setAttribute("aria-current", index === current ? "true" : "false");
  });
  share.hidden = !result.home;
  leaveHint.hidden = !result.home || result.delivered.length !== parcels.length;
  if (!leaveHint.hidden) {
    const selected = hintTile.value;
    hintTile.replaceChildren(...route.filter((tile) => board.tiles[tile] === ".").map((tile) => {
      return new Option(tileLabel(tile), String(tile), false, String(tile) === selected);
    }));
  }
  shareResult.textContent = "";
  undo.disabled = route.length === 1;
  restart.disabled = route.length === 1;
  steps.textContent = (board.budget - result.moves) + " moves left";
  items.forEach((item, index) => {
    const parcel = parcels[index];
    const delivered = result.delivered.includes(parcel);
    const pickedUp = route.includes(board.tiles.indexOf(parcel.pickup));
    item.textContent = parcel.icon + " " + parcel.label + " · " + (delivered ? "Delivered" : pickedUp ? "Carrying" : "To collect");
    item.classList.toggle("delivered", delivered);
  });
  if (result.home) {
    status.textContent = result.delivered.length === parcels.length
      ? "Perfect shift! All three parcels home in " + result.moves + " moves."
      : result.delivered.length + "/3 delivered. Undo to try a better route.";
  } else if (!available.includes(true)) {
    status.textContent = "No moves left from here. Undo to try a different street.";
  } else {
    status.textContent = result.delivered.length + "/3 delivered · " + (route.length === 1 ? "Pick your first street." : "Choose your next street.");
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(route));
  } catch {
    // A storage restriction does not prevent play.
  }
}

function move(index) {
  if (canMove(board, route, index)) {
    route.push(index);
    render();
  }
}

undo.addEventListener("click", () => {
  if (route.length > 1) route.pop();
  render();
});
restart.addEventListener("click", () => {
  route = [board.start];
  render();
});

share.addEventListener("click", async () => {
  const { delivered, moves } = classify(board, route);
  const date = new Date(day * 86400000).toISOString().slice(0, 10);
  const text = "🐦 Pigeon Shift " + date + " · " + delivered.length + "/3 deliveries · " + moves + " moves" + (shownHint === null ? "" : " · used a hint");
  try {
    await navigator.clipboard.writeText(text);
    shareResult.textContent = "Score copied.";
  } catch {
    shareResult.textContent = text;
  }
});

async function requestHint(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Courier handoff is unavailable.");
  return result;
}

revealHint.addEventListener("click", async () => {
  revealHint.disabled = true;
  try {
    const tile = practice ? readClue(practiceKey) : (await requestHint("/api/hint?day=" + day)).tile;
    if (!Number.isInteger(tile) || board.tiles[tile] !== ".") {
      hintStatus.textContent = "No clue yet. A courier can leave one after a perfect shift.";
      return;
    }
    shownHint = tile;
    try {
      localStorage.setItem(revealedKey, JSON.stringify(tile));
    } catch {
      // The hint still works for this session.
    }
    render();
    hintStatus.textContent = tileLabel(tile) + " is on a winning route.";
  } catch {
    hintStatus.textContent = "Couldn’t get a clue. Try again in a moment.";
  } finally {
    revealHint.disabled = false;
  }
});

leaveHint.addEventListener("submit", async (event) => {
  event.preventDefault();
  const tile = Number(hintTile.value);
  if (!validHandoff(board, route, tile)) return;
  const submit = leaveHint.querySelector("button");
  submit.disabled = true;
  try {
    if (practice) {
      localStorage.setItem(practiceKey, JSON.stringify(tile));
    } else {
      await requestHint("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, tile, route }),
      });
    }
    hintStatus.textContent = practice ? "Practice clue saved in this browser." : "One street left for the next courier.";
  } catch (error) {
    hintStatus.textContent = error instanceof SyntaxError ? "Couldn’t leave a clue. Try again in a moment." : error.message;
  } finally {
    submit.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLSelectElement) return;
  const current = route.at(-1);
  const keyMoves = {
    ArrowUp: current - board.width,
    ArrowDown: current + board.width,
    ArrowLeft: current - 1,
    ArrowRight: current + 1,
  };
  if (!Object.hasOwn(keyMoves, event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  move(keyMoves[event.key]);
});
render();
