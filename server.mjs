import { context, createServer, getServerPort, reddit, redis } from "@devvit/web/server";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { boardForDay, sampleDay, validHandoff } from "./game.mjs";

const app = new Hono();
const hintKey = (day) => "courier-hint:" + day;
const dayMs = 86400000;

app.get("/api/hint", async (c) => {
  const day = sampleDay();
  if (c.req.query("day") !== String(day)) return c.json({ error: "The daily board has changed. Reload to play today." }, 409);
  const value = await redis.get(hintKey(day));
  return c.json({ tile: value == null ? null : Number(value) });
});

app.post("/api/hint", async (c) => {
  if (!context.userId) return c.json({ error: "Sign in to Reddit to leave a hint." }, 401);
  const payload = await c.req.json().catch(() => null);
  const day = sampleDay();
  if (payload?.day !== day) return c.json({ error: "The daily board has changed. Reload to play today." }, 409);
  if (!validHandoff(boardForDay(day), payload.route, payload.tile)) {
    return c.json({ error: "Pick a plain street from a perfect delivery route." }, 400);
  }

  // The latest courier's one-tile clue replaces the previous clue.
  // The route and user identity are discarded.
  await redis.set(hintKey(day), String(payload.tile), { expiration: new Date((day + 1) * dayMs) });
  return c.json({ saved: true });
});

app.post("/internal/menu/post", async (c) => {
  const post = await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: "Pigeon Shift · The daily lost-and-found route",
    entry: "default",
  });
  return c.json({ navigateTo: "https://www.reddit.com/comments/" + post.id.replace(/^t3_/, "") });
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
