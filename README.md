# SpherePx Office

A real-time multiplayer 3D office built with Three.js and a lightweight WebSocket server.

---

## Stack

| Layer | Technology |
|---|---|
| 3D rendering | [Three.js](https://threejs.org/) v0.170 |
| Post-processing | [postprocessing](https://github.com/pmndrs/postprocessing) (bloom) |
| In-world text | [troika-three-text](https://github.com/protectwise/troika/tree/main/packages/troika-three-text) |
| Asset format | glTF 2.0 (`.gltf` + `.bin` + textures) |
| Dev server / bundler | [Vite](https://vitejs.dev/) v6 |
| Multiplayer server | Node.js + [ws](https://github.com/websockets/ws) v8 |

---

## Project structure

```
index.html          # Entry point, lobby UI, HUD
server.js           # WebSocket server (Node.js)
vite.config.js
src/
  main.js           # Scene bootstrap, render loop
  controls.js       # First-person pointer-lock controls
  multiplayer.js    # WebSocket client, remote player rendering
  character.js      # GLTF character loader with material fixes
  desk.js           # Generic GLTF prop loader
  frame.js          # Picture-frame helper
  lobby.js          # Name + character selection screen
  office/
    room.js         # Walls, floor, ceiling, windows
    furniture.js    # Procedural furniture meshes
    decorations.js  # Balloons, banners, confetti
  scenes/           # Animated scene overlays
  utils/
    collision.js    # AABB collision system
    constants.js    # Room dimensions, colours, spawn point
public/             # Static GLTF models and textures
```

---

## Getting started

```bash
npm install

# Terminal 1 — WebSocket server
npm run server

# Terminal 2 — Vite dev server
npm run dev
```

Both can be started together with `npm start`.

Open `http://localhost:5173` in one or more browser tabs to see multiplayer in action.

---

## Multiplayer architecture

The multiplayer layer is intentionally minimal — no game-engine framework, just raw WebSockets.

### Server (`server.js`)

- A single `WebSocketServer` (port `8080`) keeps an in-memory `Map` of connected players (`id → { name, character, x, y, z }`).
- IDs are random UUIDs generated server-side; clients never choose their own ID.
- Input is sanitised on arrival: the name is capped at 32 characters and HTML special characters are stripped; the character value is validated against a whitelist.
- **Message types handled:**

  | Type (client → server) | Effect |
  |---|---|
  | `join` | Registers the player, replies with `welcome` (current player list), broadcasts `playerJoined` to everyone else |
  | `move` | Updates stored position, broadcasts `playerMoved` to everyone else |
  | *(disconnect)* | Removes player, broadcasts `playerLeft` |

### Client (`src/multiplayer.js`)

- Connects to `ws://localhost:8080` (overridable via the `VITE_WS_URL` env variable).
- On `welcome`, spawns Three.js `Group` objects for each already-present player and immediately broadcasts the local camera position so existing players don't see the newcomer stuck at the origin.
- Remote players are represented as a **group** containing:
  - A loaded GLTF character model (same assets as the local player selection).
  - A canvas-texture **name label sprite** floating above the model.
- **Position updates are throttled** to ~20 fps (every 50 ms) and skipped entirely when the local player hasn't moved (dead-zone < 0.005 units), keeping bandwidth low.
- Received positions are **lerped** each animation frame (`delta * 12`) for smooth visual movement, decoupled from the server tick rate.
- Model rotation is derived from the movement delta (`atan2`) and also smoothly interpolated, so remote avatars turn naturally rather than snapping.

### WebSocket URL configuration

By default the client connects to `ws://localhost:8080`. For a deployed environment set the env variable before building:

```bash
VITE_WS_URL=wss://your-server.example.com npm run build
```
