# RPG Engine & Invention Engine Ecosystem

A Web-Based 3D Open-World RPG Engine Skeleton designed to consume procedural JSON data from a World Generator and dynamically construct a navigable, lore-accurate 3D world without manual authoring.

---

## 🌟 Core Vision

To build a deterministic, procedural 3D game engine that translates raw geographic, geopolitical, and narrative data (JSON) into a living, breathing world. This engine acts as the runtime environment for the **Invention Engine** ecosystem, adhering to "convention over configuration" to dynamically compile custom games.

---

## 🏗️ Architecture & Features

### 1. Spatial Grid & Terrain Assembly
* **Topological Mesh Compiler:** Transforms heightmaps and Voronoi cell data into a 3D terrain mesh using Three.js.
* **Voronoi Territory Partitioning:** Dynamically paints cultural borders directly onto the terrain shader using vertex coloring.
* **Anti-Clipping Physics:** Automatic terrain height evaluation pushes the player and camera up to prevent falling through hills or clipping below the ground.

### 2. Convention-Over-Configuration Assets
Decoupled game assets are loaded on the fly from the `/game` directory structure:
* **Models & Spells:** Dynamically imports player models (`game/characters/player/model.js`) and abilities (`abilities.json`).
* **Narratives & Quests:** Parses dialogues (`dialogues.json`) and registers items (`game/items/registry.json`).
* **Environment Theme Configs:** Dynamically swaps color palettes and light parameters (`game/config/theme.json`).

### 3. Interactive UI & Game States
* **UI State Machine:** Structured pausing, main menu, settings, dialogue boxes, and inventory panels.
* **Settings Overlay:** Live controls for:
  * Music and Sound Effects (SFX) Volume.
  * **Camera Sensitivity** slider (10% to 300% scale).
  * **Invert Y-Axis** checkbox for camera orbit controls.
  * Persists user configurations directly into `localStorage`.
* **Minimap Overlay:** Real-time 2D pixel-cultural representation with Origin Centers and pulsing player indicators.

### 4. Advanced Web Performance Optimizations
* **Instanced Rendering:** Recurring items (like foliage, rocks, shrines) are batched using `THREE.InstancedMesh`.
* **Frustum & Spatial-Hash Culling:** Dynamic distance checks disable distant meshes and physical collisions to keep frame rates smooth.

### 5. Multi-Game Packaging & Deployment Pipeline
Provides an automated pipeline tool to bundle standalone custom games:
* Run the asset compiler:
  ```bash
  node scripts/package-game.js
  ```
* **How it works:**
  1. Ingests world data from `game/config/world.json`.
  2. Generates a sandboxed directory (`/games/<world-slug>`).
  3. Automatically copies and injects custom metadata and descriptions into `index.html`.
  4. Triggers a production-level `yarn vite build` targeted to compile a lightweight standalone version in `/dist/games/<world-slug>`.
  5. Compresses the build into a ready-to-deploy ZIP archive under `dist/games/<world-slug>.zip`.

---

## 🚀 Getting Started

### Local Development
1. Install dependencies:
   ```bash
   yarn install
   ```
2. Start the dev server:
   ```bash
   yarn dev
   ```
3. Open `http://localhost:5173/` in your browser.

### Package a World Build
To package your procedural world into a self-contained ZIP archive ready for GitHub Pages or Netlify deployment:
```bash
node scripts/package-game.js
```

---

## 📜 License

MIT License
