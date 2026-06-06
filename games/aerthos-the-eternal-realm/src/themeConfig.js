// Theme Configuration System for RPG Engine
export let ACTIVE_THEME = 'cyberpunk';
export let themeConfig = {};

export async function loadThemeConfig() {
  try {
    const response = await fetch('./game/config/theme.json');
    if (!response.ok) throw new Error("Theme config response not ok");
    const data = await response.json();
    ACTIVE_THEME = data.activeTheme || 'cyberpunk';
    themeConfig = data.themes || {};
  } catch (e) {
    console.error("Failed to load theme configuration, using fallback:", e);
    // Fallback in case loading fails
    ACTIVE_THEME = 'cyberpunk';
    themeConfig = {
      cyberpunk: {
        name: "Neo-Cyberpunk",
        desc: "A futuristic wasteland of chrome wireframes, neon lights, and concrete bunkers.",
        structures: {
          Turchian: { type: 'yurt', clothColor: 0x212121, woodColor: 0x00e5ff, roofColor: 0xff0055 },
          Ulus: { type: 'yurt', clothColor: 0x212121, woodColor: 0x00e5ff, roofColor: 0xff0055 },
          Shwazen: { type: 'industrial', baseColor: 0x111111, pipeColor: 0x00ff66, lightColor: 0x00ff66 },
          Astellian: { type: 'pillar', baseColor: 0x1c1c1c, topColor: 0x00e5ff },
          Elladan: { type: 'archway', stoneColor: 0x37474f },
          Luari: { type: 'obelisk', pedColor: 0x1a1a1a, coreColor: 0xff00ff, lightColor: 0xff00ff },
          Slovan: { type: 'shrine', woodColor: 0x212121, roofColor: 0xff0055 },
          Wildlands: { type: 'campfire', logColor: 0x1a1a1a, fireColor: 0x00ff66, stoneColor: 0x424242, lightColor: 0x00ff66 }
        },
        trees: {
          Elladan: { type: 'glowing', trunkColor: 0x1a1a1a, leavesColor: 0xff00ff, bulbColor: 0x00e5ff },
          Wildlands: { type: 'pine', trunkColor: 0x212121, leavesColor: 0x00ff66 },
          Shwazen: { type: 'gear', trunkColor: 0x2c2c2c, leavesColor: 0x00e5ff, gearColor: 0xff0055 },
          Astellian: { type: 'crystalline', trunkColor: 0x1c1c1c, leavesColor: 0xffb300 },
          Luari: { type: 'arcane', trunkColor: 0x212121, leavesColor: 0xff00ff },
          default: { type: 'standard', trunkColor: 0x111111, leavesColor: 0x00e5ff }
        }
      }
    };
  }
}
