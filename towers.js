const ZONES = [
    { name: 'Grassy Hills', minY: 0, maxY: 33, skyColor: '#fcebc7', fogDensity: 0.012 },
    { name: 'Ice Peaks', minY: 33, maxY: 63, skyColor: '#cce8f4', fogDensity: 0.013 },
    { name: 'Lava Ruins', minY: 63, maxY: 93, skyColor: '#2a0a00', fogDensity: 0.020 },
    { name: 'Sky Kingdom', minY: 93, maxY: 123, skyColor: '#5c9ead', fogDensity: 0.010 },
    { name: 'Neon City', minY: 123, maxY: 151, skyColor: '#1a0533', fogDensity: 0.018 },
    { name: 'Crystal Caves', minY: 151, maxY: 189, skyColor: '#0d2633', fogDensity: 0.015 },
    { name: 'The Void', minY: 189, maxY: 235, skyColor: '#050510', fogDensity: 0.022 },
    { name: 'Steampunk District', minY: 235, maxY: 265, skyColor: '#240835', fogDensity: 0.016 },
    { name: 'Cosmic Dreamscape', minY: 265, maxY: 300, skyColor: '#120b2e', fogDensity: 0.014 },
    { name: 'Ancient Temple', minY: 300, maxY: 999, skyColor: '#4f3e2d', fogDensity: 0.018 },
];

const TOWERS = [
  // --- TOWER 0: The Classic Climb ---
  {
    spawn: new THREE.Vector3(0, 2, 0),
    goalPos: new THREE.Vector3(8, 335, 8),
    platforms: [
        [0, -0.5, 0, 25, 1, 25, 0xebdbb2],
        [6, 2, -4, 4, 1, 4, 0x4caf50], [10, 4, -9, 4, 1, 4, 0x66bb6a], [5, 6, -15, 5, 1, 5, 0x4aa54a],
        [-3, 8, -19, 4, 1, 4, 0x388e3c], [-10, 10, -16, 4, 1, 4, 0x66bb6a], [-15, 12, -10, 5, 1, 5, 0x4caf50],
        [-12, 14, -2, 4, 1, 4, 0x4aa54a], [-6, 16, 5, 4, 1, 4, 0x81c784], [2, 18, 8, 5, 1, 5, 0x4caf50],
        [9, 20, 4, 4, 1, 4, 0x66bb6a], [-2, 22, -12, 4, 1, 4, 0x4aa54a], [-8, 24, -18, 5, 1, 5, 0x388e3c],
        [-14, 26, -12, 4, 1, 4, 0x81c784], [-18, 28, -4, 4, 1, 4, 0x4caf50], [-14, 30, 5, 6, 1, 6, 0xa5d6a7],
        [-8, 33, 10, 4, 1, 4, 0x90caf9], [-2, 35, 14, 4, 1, 4, 0xb3e5fc], [5, 37, 11, 5, 1, 5, 0x81d4fa],
        [10, 39, -3, 4, 1, 4, 0x90caf9], [14, 41, -10, 4, 1, 4, 0xb3e5fc], [9, 43, -17, 5, 1, 5, 0x80deea],
        [2, 45, -21, 4, 1, 4, 0x90caf9], [-5, 47, -18, 4, 1, 4, 0xb3e5fc], [-14, 53, -4, 5, 1, 5, 0x81d4fa],
        [-18, 55, 4, 4, 1, 4, 0x90caf9], [-14, 57, 12, 4, 1, 4, 0xb3e5fc], [-7, 59, 16, 4, 1, 4, 0x80deea],
        [0, 61, 14, 6, 1, 6, 0xe1f5fe], [6, 63, 8, 4, 1, 4, 0xbf360c], [11, 65, 2, 4, 1, 4, 0xe64a19],
        [8, 67, -5, 5, 1, 5, 0xbf360c], [2, 69, -11, 4, 1, 4, 0xd84315], [-9, 71, -3, 4, 1, 4, 0xbf360c],
        [-14, 73, 3, 4, 1, 4, 0xe64a19], [-11, 75, 10, 5, 1, 5, 0xbf360c], [-5, 77, 15, 4, 1, 4, 0xd84315],
        [2, 79, 12, 4, 1, 4, 0xe64a19], [12, 84, 0, 5, 1, 5, 0xbf360c], [9, 86, -8, 4, 1, 4, 0xe64a19],
        [3, 88, -13, 4, 1, 4, 0xd84315], [-3, 90, -9, 5, 1, 5, 0xbf360c], [-8, 92, -2, 6, 1, 6, 0xff5722],
        [-12, 94, 6, 5, 1, 5, 0xfff59d], [-9, 96, 14, 4, 1, 4, 0xfff9c4], [-3, 98, 18, 4, 1, 4, 0xffd54f],
        [14, 100, 8, 4, 1, 4, 0xfff59d], [17, 102, 0, 4, 1, 4, 0xfff9c4], [13, 104, -8, 5, 1, 5, 0xffd54f],
        [6, 106, -14, 4, 1, 4, 0xfff59d], [0, 108, -18, 4, 1, 4, 0xfff9c4], [-10, 115, -6, 5, 1, 5, 0xffd54f],
        [-15, 117, 2, 4, 1, 4, 0xfff59d], [-12, 119, 10, 4, 1, 4, 0xfff9c4], [-6, 121, 15, 6, 1, 6, 0xffe082],
        [0, 123, 12, 4, 1, 4, 0xce93d8], [6, 125, 7, 4, 1, 4, 0x80deea], [10, 127, 0, 4, 1, 4, 0xf48fb1],
        [-8, 129, -2, 4, 1, 4, 0xce93d8], [-13, 131, 5, 4, 1, 4, 0x80deea], [-10, 133, 13, 4, 1, 4, 0xf48fb1],
        [-4, 135, 18, 5, 1, 5, 0xce93d8], [3, 137, 15, 4, 1, 4, 0x80deea], [13, 139, -5, 4, 1, 4, 0xf48fb1],
        [16, 141, -13, 4, 1, 4, 0xce93d8], [10, 143, -19, 5, 1, 5, 0x80deea], [3, 145, -22, 4, 1, 4, 0xf48fb1],
        [-4, 147, -18, 4, 1, 4, 0xce93d8], [-9, 149, -10, 6, 1, 6, 0x80deea], [-12, 151, -2, 4, 1, 4, 0xb2ebf2],
        [-8, 153, 6, 4, 1, 4, 0xe1bee7], [-2, 155, 11, 4, 1, 4, 0xb2dfdb], [14, 157, 1, 4, 1, 4, 0xb2ebf2],
        [17, 159, -7, 4, 1, 4, 0xe1bee7], [12, 161, -14, 4, 1, 4, 0xb2dfdb], [5, 163, -19, 5, 1, 5, 0xb2ebf2],
        [-2, 165, -22, 4, 1, 4, 0xe1bee7], [-12, 170, -8, 4, 1, 4, 0xb2dfdb], [-15, 172, 0, 4, 1, 4, 0xb2ebf2],
        [-11, 174, 8, 4, 1, 4, 0xe1bee7], [-5, 176, 13, 5, 1, 5, 0xb2dfdb], [12, 178, 4, 4, 1, 4, 0xb2ebf2],
        [15, 180, -4, 4, 1, 4, 0xe1bee7], [11, 182, -11, 5, 1, 5, 0xb2dfdb], [5, 184, -16, 4, 1, 4, 0xb2ebf2],
        [-1, 186, -13, 4, 1, 4, 0xe1bee7], [-6, 188, -6, 6, 1, 6, 0xb3cde8], [-8, 190, 2, 4, 1, 4, 0x37474f],
        [-4, 192, 9, 4, 1, 4, 0x263238], [2, 194, 13, 4, 1, 4, 0x37474f], [12, 201, 2, 4, 1, 4, 0x263238],
        [14, 203, -6, 4, 1, 4, 0x37474f], [-5, 205, -18, 4, 1, 4, 0x263238], [-10, 207, -12, 4, 1, 4, 0x37474f],
        [-14, 209, -5, 4, 1, 4, 0x263238], [0, 211, 10, 4, 1, 4, 0x37474f], [4, 213, 17, 4, 1, 4, 0x263238],
        [-1, 215, -3, 4, 1, 4, 0x37474f], [-5, 217, -10, 4, 1, 4, 0x263238], [-1, 219, -17, 5, 1, 5, 0x37474f],
        [5, 221, -20, 4, 1, 4, 0x263238], [14, 228, -7, 4, 1, 4, 0x37474f], [-5, 230, 7, 4, 1, 4, 0x263238],
        [-8, 232, 14, 4, 1, 4, 0x37474f], [-4, 234, 20, 6, 1, 6, 0x455a64], [0, 235, 16, 6, 1, 6, 0x455a64],
        // ── ZONE 8: Cyberpunk District (y 235–265) ────────
        [5, 237, 10, 4, 1, 4, 0xba68c8], [10, 239, 4, 4, 1, 4, 0x9c27b0], 
        [-12, 245, 5, 4, 1, 4, 0x9c27b0], 
        [3, 251, 15, 4, 1, 4, 0x9c27b0], [12, 253, 10, 4, 1, 4, 0x7b1fa2], 
        [4, 262, -12, 4, 1, 4, 0x7b1fa2],
        [-2, 264, -16, 6, 1, 6, 0xba68c8],
        // ── ZONE 9: Cosmic Dreamscape (y 265–300) ────────
        [-8, 266, -12, 4, 1, 4, 0x5c6bc0], [-14, 268, -8, 4, 1, 4, 0x3f51b5], 
        [5, 274, 12, 4, 1, 4, 0x3f51b5], [12, 276, 8, 4, 1, 4, 0x283593],
        [-9, 291, -20, 4, 1, 4, 0x3f51b5], [-15, 293, -15, 4, 1, 4, 0x283593],
        [-12, 295, -8, 5, 1, 5, 0x5c6bc0], [-6, 298, -2, 6, 1, 6, 0x7986cb],
        // ── ZONE 10: Ancient Temple (y 300+) ───────────────
        [0, 300, 4, 4, 1, 4, 0x8d6e63], [6, 302, 10, 4, 1, 4, 0x795548], 
        [8, 305, 1, 5, 1, 5, 0x8d6e63], 
        [10, 308, -8, 4, 1, 4, 0x795548], 
        [4, 311, -4, 5, 1, 5, 0xa1887f], [-2, 314, 0, 5, 1, 5, 0x8d6e63],
        [-8, 317, 4, 5, 1, 5, 0x795548], [-12, 320, 6, 5, 1, 5, 0x5d4037],
        [-14, 321, 2, 4, 1, 4, 0x5d4037],
        [-8, 323, 8, 4, 1, 4, 0x8d6e63], [-2, 325, 14, 4, 1, 4, 0x795548], [5, 327, 20, 5, 1, 5, 0x5d4037],
        [12, 329, 24, 4, 1, 4, 0x8d6e63], [18, 331, 20, 4, 1, 4, 0x795548], [14, 333, 14, 6, 1, 6, 0xa1887f],
        [8, 335, 8, 6, 1, 6, 0xf9a825]
    ],
    movingPlatforms: [
        { start: [12, 22, -5], end: [3, 22, -5], speed: 2.5, w: 4, h: 1, d: 4, color: 0x4aa54a },
        { start: [10, 38, 5], end: [10, 38, 16], speed: 3.0, w: 4, h: 1, d: 4, color: 0x90caf9 },
        { start: [-10, 47, -10], end: [-10, 53, -10], speed: 2.0, w: 4, h: 1, d: 4, color: 0x81d4fa },
        { start: [-5, 71, -8], end: [5, 71, -8], speed: 3.5, w: 4, h: 1, d: 4, color: 0xff5722 },
        { start: [8, 79, 6], end: [8, 84, 6], speed: 2.5, w: 4, h: 1, d: 4, color: 0xbf360c },
        { start: [4, 100, 14], end: [14, 100, 14], speed: 3.0, w: 4, h: 1, d: 4, color: 0xffd54f },
        { start: [-7, 109, -13], end: [-7, 115, -13], speed: 2.0, w: 4, h: 1, d: 4, color: 0xfff59d },
        { start: [6, 129, -7], end: [-4, 129, -7], speed: 3.5, w: 4, h: 1, d: 4, color: 0xce93d8 },
        { start: [9, 139, 8], end: [9, 139, -2], speed: 3.0, w: 4, h: 1, d: 4, color: 0xf48fb1 },
        { start: [4, 157, 7], end: [14, 157, 7], speed: 3.0, w: 4, h: 1, d: 4, color: 0xb2ebf2 },
        { start: [-8, 165, -15], end: [-8, 170, -15], speed: 2.5, w: 4, h: 1, d: 4, color: 0xe1bee7 },
        { start: [2, 177, 10], end: [12, 177, 10], speed: 3.5, w: 4, h: 1, d: 4, color: 0xb2dfdb },
        { start: [8, 196, 8], end: [8, 201, 8], speed: 2.5, w: 4, h: 1, d: 4, color: 0x546e7a },
        { start: [8, 205, -12], end: [-2, 205, -12], speed: 4.0, w: 4, h: 1, d: 4, color: 0x37474f },
        { start: [-10, 211, 3], end: [0, 211, 3], speed: 3.5, w: 4, h: 1, d: 4, color: 0x546e7a },
        { start: [13, 214, 10], end: [13, 214, 2], speed: 3.5, w: 4, h: 1, d: 4, color: 0x37474f },
        { start: [10, 223, -14], end: [10, 228, -14], speed: 2.5, w: 4, h: 1, d: 4, color: 0x546e7a },
        { start: [10, 230, 0], end: [-2, 230, 0], speed: 4.0, w: 4, h: 1, d: 4, color: 0x37474f },
        { start: [4, 241, -2], end: [-6, 243, -2], speed: 4.5, w: 4, h: 1, d: 4, color: 0x9c27b0 },
        { start: [-10, 247, 12], end: [-4, 249, 18], speed: 3.5, w: 4, h: 1, d: 4, color: 0x7b1fa2 },
        { start: [16, 255, 2], end: [11, 260, -8], speed: 3.0, w: 4, h: 1, d: 4, color: 0xba68c8 },
        { start: [-10, 270, 0], end: [-2, 272, 6], speed: 3.5, w: 4, h: 1, d: 4, color: 0x3f51b5 },
        { start: [16, 278, 0], end: [10, 285, -5], speed: 3.0, w: 4, h: 1, d: 4, color: 0x5c6bc0 },
        { start: [4, 287, -10], end: [-3, 289, -15], speed: 4.0, w: 4, h: 1, d: 4, color: 0x283593 },
        { start: [-10, 319, -4], end: [-14, 321, 2], speed: 4.5, w: 4, h: 1, d: 4, color: 0x5d4037 },
    ],
    droppingPlatforms: [
        [4, 18, 0, 4, 1, 4, 0xff5555], 
        [-12, 45, 0, 4, 1, 4, 0xff5555], 
        [8, 112, 4, 4, 1, 4, 0xff5555]
    ]
  },
  // --- TOWER 1: The Neon Dash ---
  {
      spawn: new THREE.Vector3(0, 2, 0),
      goalPos: new THREE.Vector3(0, 85, 0),
      platforms: [ 
          [0, -0.5, 0, 25, 1, 25, 0xce93d8],
          [0, 85, 0, 6, 1, 6, 0xf9a825] 
      ],
      movingPlatforms: [
          { start: [-5, 5, 0], end: [5, 5, 0], speed: 3, w: 4, h: 1, d: 4, color: 0xf48fb1 },
          { start: [15, 15, 0], end: [15, 25, 0], speed: 3, w: 4, h: 1, d: 4, color: 0xf48fb1 },
          { start: [15, 35, 0], end: [-15, 35, 0], speed: 6, w: 4, h: 1, d: 4, color: 0xf48fb1 },
          { start: [-15, 45, 0], end: [-15, 55, 0], speed: 4, w: 4, h: 1, d: 4, color: 0xf48fb1 },
          { start: [-5, 65, 0], end: [5, 65, 0], speed: 5, w: 4, h: 1, d: 4, color: 0xf48fb1 },
          { start: [0, 75, -5], end: [0, 75, 5], speed: 3, w: 4, h: 1, d: 4, color: 0xf48fb1 }
      ],
      droppingPlatforms: [ 
          [5, 10, 0, 4, 1, 4, 0xff5555], 
          [-5, 20, 0, 4, 1, 4, 0xff5555], 
          [0, 30, 0, 4, 1, 4, 0xff5555], 
          [0, 40, 0, 4, 1, 4, 0xff5555], 
          [0, 60, 0, 4, 1, 4, 0xff5555], 
          [0, 70, 0, 4, 1, 4, 0xff5555] 
      ]
  },
  // --- TOWER 2: The Zig-Zag Ledges ---
  {
      spawn: new THREE.Vector3(0, 2, 0),
      goalPos: new THREE.Vector3(0, 100, 0),
      platforms: [ 
          [0, -0.5, 0, 25, 1, 25, 0xebdbb2], 
          [10, 10, 0, 4, 1, 4, 0x4caf50], [-10, 20, 0, 4, 1, 4, 0x4caf50], 
          [10, 30, 0, 4, 1, 4, 0x4caf50], [-10, 40, 0, 4, 1, 4, 0x4caf50], 
          [10, 50, 0, 4, 1, 4, 0x4caf50], [-10, 60, 0, 4, 1, 4, 0x4caf50], 
          [10, 70, 0, 4, 1, 4, 0x4caf50], [-10, 80, 0, 4, 1, 4, 0x4caf50], 
          [10, 90, 0, 4, 1, 4, 0x4caf50], 
          [0, 100, 0, 6, 1, 6, 0xf9a825] 
      ],
      movingPlatforms: [],
      droppingPlatforms: []
  },
  // --- TOWER 3: The 2D Duel (Split-Screen Race Map) ---
  {
      spawn: new THREE.Vector3(0, 2, 0),
      goalPos: new THREE.Vector3(60, 108, 0),
      platforms: [ 
          [0, -0.5, 0, 40, 1, 2, 0xebdbb2], // Start area wide floor
          // Sector 1: The Squeeze (Low Ceilings)
          [6, 3, 0, 4, 1, 2, 0x4caf50], [12, 6, 0, 4, 1, 2, 0x66bb6a],
          [20, 9, 0, 6, 1, 2, 0x81c784], 
          // Sector 2: The Great Void (Gap too large to jump - Forced Moving Platform)
          [48, 12, 0, 8, 1, 2, 0x90caf9], 
          // Sector 3: The Zig-Zag Climb (Ledge Grabs)
          [45, 16.5, 0, 4, 1, 2, 0xb3e5fc], [50, 21, 0, 4, 1, 2, 0x81d4fa],
          [44, 25.5, 0, 4, 1, 2, 0xe1f5fe], [49, 30, 0, 4, 1, 2, 0xff5722],
          [43, 34.5, 0, 4, 1, 2, 0xff9800], [48, 39, 0, 5, 1, 2, 0xffb74d],
          // Sector 4: Final Bridge & Drop
          [35, 43.5, 0, 6, 1, 2, 0xce93d8], [25, 48, 0, 4, 1, 2, 0xba68c8],
          [15, 52.5, 0, 4, 1, 2, 0x9c27b0], [5, 57, 0, 4, 1, 2, 0x7b1fa2],
          [18, 61, 0, 6, 1, 2, 0xebdbb2], // Intermediate bridge platform
          [30, 61.5, 0, 6, 1, 2, 0xfff59d], 
          // Sector 5: The Glass Elevator (Wait for small moving platform)
          [20, 66, 0, 4, 0.5, 2, 0x81d4fa], [10, 71, 0, 4, 0.5, 2, 0x81d4fa],
          // Sector 6: Vertical Shaft (Ledge grabs)
          [0, 76, 0, 3, 1, 2, 0xff5722], [5, 81, 0, 3, 1, 2, 0xff9800],
          [-5, 86, 0, 3, 1, 2, 0xffb74d], [0, 91, 0, 3, 1, 2, 0xffcc80],
          // Sector 7: The Final Grind (Thin walkway)
          [15, 95, 0, 20, 1, 1, 0xce93d8],
          // Sector 8: Zenith (Final Platforms)
          [40, 100, 0, 6, 1, 2, 0xba68c8], [50, 105, 0, 6, 1, 2, 0x9c27b0],
          [60, 108, 0, 12, 1, 4, 0xf9a825] // New Goal Platform
      ],
      movingPlatforms: [
          // Moving Bridge across the Great Void
          { start: [25, 10, 0], end: [42, 10, 0], speed: 4.5, w: 5, h: 1, d: 2, color: 0x4caf50 },
          // Vertical Lift in Sector 3
          { start: [52, 15, 0], end: [52, 40, 0], speed: 3.0, w: 3, h: 1, d: 2, color: 0xb3e5fc },
          // Sector 5: Fast lifts
          { start: [0, 62, 0], end: [0, 75, 0], speed: 6.5, w: 3, h: 0.5, d: 2, color: 0x81d4fa },
          { start: [10, 91, 0], end: [10, 100, 0], speed: 5.5, w: 3, h: 0.5, d: 2, color: 0x81d4fa },
          // Final moving obstacle
          { start: [30, 102, 0], end: [40, 102, 0], speed: 8.0, w: 4, h: 1, d: 2, color: 0xffd54f }
      ],
      droppingPlatforms: [
          [28, 47, 0, 4, 1, 2, 0xff5555], 
          [18, 51, 0, 4, 1, 2, 0xff5555], 
          [8, 56, 0, 4, 1, 2, 0xff5555],
          // Sector 7: Dropping hazards
          [25, 94.5, 0, 3, 1, 2, 0xff5555],
          [35, 94.5, 0, 3, 1, 2, 0xff5555]
      ]
  }
];
