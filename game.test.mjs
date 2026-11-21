import assert from "node:assert/strict";
import test from "node:test";
import { boardForDay, canMove, classify, validHandoff } from "./game.mjs";

function solve(board, route = [board.start]) {
  const last = route.at(-1);
  const street = route.find((tile) => board.tiles[tile] === ".");
  if (board.tiles[last] === "H") return validHandoff(board, route, street) ? route : null;
  for (const next of [last - 1, last + 1, last - board.width, last + board.width]) {
    if (!canMove(board, route, next)) continue;
    const result = solve(board, [...route, next]);
    if (result) return result;
  }
  return null;
}

test("all twelve daily boards are distinct and have a perfect route", () => {
  const seen = new Set();
  for (let day = 0; day < 12; day++) {
    const board = boardForDay(day);
    assert(!seen.has(board.tiles));
    seen.add(board.tiles);
    assert(solve(board), "No perfect route on day " + day);
  }
});

test("a handoff must mark one visited street from a legal perfect route", () => {
  const board = boardForDay(0);
  const goodRoute = solve(board);
  const hint = goodRoute.find((tile) => board.tiles[tile] === ".");
  const offRoute = [...board.tiles].findIndex((tile, index) => tile === "." && !goodRoute.includes(index));
  assert(validHandoff(board, goodRoute, hint));
  assert(!validHandoff(board, goodRoute, offRoute));
  assert(!validHandoff(board, goodRoute, board.start));
  assert(!validHandoff(board, goodRoute.slice(0, -1), hint));
  assert(!validHandoff(board, [board.start, hint, board.start, ...goodRoute.slice(1)], hint));
  assert(!validHandoff(board, [board.start, goodRoute.at(-1)], hint));
});

test("crossing a doorstep before picking up its parcel does not count", () => {
  const board = boardForDay(0);
  const route = ["A", "a", "H"].map((tile) => board.tiles.indexOf(tile));
  assert.equal(classify(board, route).delivered.length, 0);
});
