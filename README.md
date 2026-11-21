# Pigeon Shift

Route a pigeon through a daily 6×5 neighborhood. Collect three odd parcels and deliver them to their matching doorsteps before reaching the home rooftop. Every tile is single-use and there are 16 moves. Undo and restart let anyone explore a tricky board.

After a perfect round, choose one plain street from your winning route to leave for the next courier. The previous courier’s one-tile hint is optional and never reveals direction or order. The post only stores the chosen tile until midnight UTC. Routes and Reddit usernames are not stored on the server.

## Run a local practice round

Serve the project directory with `python -m http.server 8080` and open `http://localhost:8080/?practice`. Practice mode stores the clue in the current browser. The Devvit version shares it via Redis.

## Build and test

Run `npm ci`, `npm test`, and `npm run build`. The build emits the client assets and a CommonJS server for Reddit. Use the official Devvit quickstart to authenticate and playtest, then choose **Post Pigeon Shift** in the subreddit moderator menu to create a playable post.

[Reddit Devvit quickstart](https://developers.reddit.com/docs/quickstart)

The twelve prototype layouts repeat. The in-game clock uses midnight UTC. The one-tile courier handoff is the entrant’s design contribution. OpenAI Codex assisted with prototyping, implementation and testing.
