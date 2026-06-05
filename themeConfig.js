// Theme Configuration System for RPG Engine
export const ACTIVE_THEME = 'cyberpunk'; // Set to 'fantasy' or 'cyberpunk'

export const themeConfig = {
  fantasy: {
    name: "High Fantasy",
    desc: "A land of ancient magic, stone shrines, and lush forests.",
    structures: {
      Turchian: { type: 'yurt', clothColor: 0xf5f5dc, woodColor: 0x5d4037, roofColor: 0xb0bec5 },
      Ulus: { type: 'yurt', clothColor: 0xf5f5dc, woodColor: 0x5d4037, roofColor: 0xb0bec5 },
      Shwazen: { type: 'industrial', baseColor: 0x424242, pipeColor: 0x8d6e63, lightColor: 0xff3300 },
      Astellian: { type: 'pillar', baseColor: 0xf5f5f5, topColor: 0xffd54f },
      Elladan: { type: 'archway', stoneColor: 0x78909c },
      Luari: { type: 'obelisk', pedColor: 0x0d47a1, coreColor: 0x00e5ff, lightColor: 0x00e5ff },
      Slovan: { type: 'shrine', woodColor: 0x8d6e63, roofColor: 0x3e2723 },
      Wildlands: { type: 'campfire', logColor: 0x5d4037, fireColor: 0xff3d00, stoneColor: 0x757575, lightColor: 0xff6d00 }
    },
    trees: {
      Elladan: { type: 'glowing', trunkColor: 0x2c3e50, leavesColor: 0x4caf50, bulbColor: 0xb3de69 },
      Wildlands: { type: 'pine', trunkColor: 0x3d2314, leavesColor: 0x1b5e20 },
      Shwazen: { type: 'gear', trunkColor: 0x757575, leavesColor: 0xdababf, gearColor: 0xca8a04 },
      Astellian: { type: 'crystalline', trunkColor: 0xd1c4e9, leavesColor: 0xfdb462 },
      Luari: { type: 'arcane', trunkColor: 0x37474f, leavesColor: 0x00e5ff },
      default: { type: 'standard', trunkColor: 0x3d2314, leavesColor: 0x2e7d32 }
    }
  },
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
