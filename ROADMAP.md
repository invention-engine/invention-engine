# Project Roadmap: RPG Engine

This roadmap details the implementation plan for building the Web-Based 3D Open-World RPG Skeleton, driven by AI vibe-coding.

## Phase 1: Core Grid Rendering & Terrain Assembly (The 'Aerthos Sandbox') [COMPLETED]
**Objective:** Read the JSON grid data and generate a navigable 3D terrain mesh.
- [x] **JSON Parser Assembly:** Write an asynchronous file-loader to ingest the world JSON payload.
- [x] **Topological Mesh Compiler:** Calculate grid dimensions and parse coordinates.
- [x] **Terrain Generation:** Instantiate a Three.BufferGeometry based on the heightmap.
- [x] **Basic Locomotion:** Implement a simple player controller with movement to traverse the terrain.

## Phase 2: Cultural Domain & Ecological Generation [COMPLETED]
**Objective:** Visually brand regions of the map based on cultures and their physical centers.
- [x] **Voronoi Territory Partitioning:** Calculate territory boundaries assigning vertices to cultural spheres.
- [x] **Vertex-Color Painting:** Feed culture hex codes into the terrain shader to paint borders dynamically.
- [x] **Seeded Scatter Engine:** Build a scatter-engine that populates cells with specific assets based on culture type.

## Phase 3: The Interactive Systems & Tradition Compiler [COMPLETED]
**Objective:** Translate the narrative JSON data (traditions and values) into actual gameplay loops.
- [x] **Tradition-to-Quest Parser:** Build an interactive template system parsing the 'traditions' arrays into procedural quests.
- [x] **Interactive Dialogue Box:** Build a modular UI that populates NPC dialogue using the 'creationMyth' and local lore strings.

## Phase 4: Production Optimization & Multi-Game Packaging [COMPLETED]
**Objective:** Optimize performance for modern web browsers and package the engine.
- [x] **Frustum & Distance Culling:** Implement an octree/spatial-hash grid to disable distant meshes/physics.
- [x] **GLTF Mesh Instancing:** Use THREE.InstancedMesh for rendering recurring elements.
- [x] **Dynamic Asset Swapping System:** Abstract asset-path configs to swap entire aesthetic themes via a single file.

## Phase 5: Multi-Game Generation, Asset Bundling & Deployment Pipeline [IN PROGRESS]
**Objective:** Enable developers to generate distinct worlds, bundle assets, and build standalone deployable games.
- [ ] **Automated World Generator CLI:**
  - Build a generation script that calls the Invention Engine World Generator with a custom seed parameter to output a unique `world.json` configuration.
- [ ] **Asset Pipeline Compiler:**
  - Create a node packaging utility (`scripts/package-game.js`) that creates a sandboxed deployment directory (e.g. `/games/my-custom-game/`).
  - Copy core JS/HTML/CSS assets and resolve asset-path references.
  - Automatically copy specific texture, heightmap, and sound directories into the bundled static folder.
- [ ] **Standalone Production Build & Deploy:**
  - Configure dynamic asset injection so `index.html` title and description match the generated world's name and lore era.
  - Run a localized Vite build compilation targeting the specific game directory (`yarn build --outDir dist/games/my-custom-game`).
  - Generate a lightweight, self-contained zip file ready to deploy directly to static web hosts (GitHub Pages, Netlify, or Vercel).

## Phase 6: Multi-User Server Backend & MMO Foundation [NEW]
**Objective:** Establish a lightweight server architecture for user state persistence and multi-player online replication.
- [ ] **User Signup & Authentication (JWT):**
  - Implement a minimal Node.js/Express server with secure registration and login endpoints.
  - Save hashed user passwords and issue JSON Web Tokens (JWT) to authorize client requests.
- [ ] **Cloud State Database Persistence:**
  - Integrate a database (e.g. SQLite or MongoDB) to save player state: last coordinates $(x, y, z)$, active region culture, completed quests, and inventory arrays.
  - Add sync endpoints (`POST /api/save`) called periodically during gameplay or at Slovan Shrines.
- [ ] **Real-Time Multiplayer MMO Engine (WebSockets):**
  - Set up a Socket.io event loop on the backend to track connected sockets.
  - Broadcast coordinate movement events (`player-move`), status updates, and chat channels so players can see each other's avatars rendered in real-time.

## Phase 7: Sound Library & Standardized Asset Pipeline [NEW]
**Objective:** Define a naming convention for all static assets and configure standard audio triggers.
- [ ] **Standardized Asset Naming Convention:**
  - Establish strict file paths that the build engine scans for and bundles:
    - Textures: `assets/textures/[theme]/ground_diffuse.png`, `ground_normal.png`.
    - Geometries: `assets/models/[theme]/tree_trunk.gltf`, `tree_canopy.gltf`, `monument.gltf`.
- [ ] **Dynamic Sound & Effects Compiler:**
  - Set up a standardized audio configuration library:
    - Background Ambience: `assets/audio/[theme]/ambient_day.mp3`, `ambient_night.mp3`.
    - Sound Effects (SFX): `sfx_step.wav` (locomotion), `sfx_jump.wav`, `sfx_attack.wav` (combat swing), `sfx_typewriter.wav` (HUD text scrolling), `sfx_blessing.wav`.
  - Compile the AudioContext loading wrapper (`audioSystem.js`) to automatically trigger these clips.

---
## Strategy for Vibe Coding
1. **Data-Driven Graphics:** Everything from terrain to lighting should be derived from the input JSON.
2. **Iterative Visuals:** Start with basic colored primitives before loading complex GLTF models.
3. **Performance First:** Keep mesh counts and draw calls low, leveraging instancing where possible.
