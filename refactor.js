const fs = require('fs');
let code = fs.readFileSync('c:/Users/e_art/OneDrive/Desktop/Antigravityplatformer/script.js', 'utf8');

// 1. Remove ZONES and TOWER from script.js
code = code.replace(/const ZONES = \[[\s\S]+?\];\s*/, '');
code = code.replace(/const TOWER = \{[\s\S]+?\}\;/g, '');

// 2. Add texture generation and currentTowerIndex
code = code.replace('let backgroundGroup = null;', `let backgroundGroup = null;
let currentTowerIndex = 0;

const textureCache = {};
function generateZoneTexture(zoneIndex, baseColorHex) {
    const key = zoneIndex + '_' + baseColorHex;
    if (textureCache[key]) return textureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = '#' + baseColorHex.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 256, 256);

    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (zoneIndex === 0) { // Grassy
        ctx.fillStyle = '#2e7d32'; 
        for(let i=0; i<15; i++) {
            ctx.beginPath();
            ctx.arc(Math.random()*256, Math.random()*256, Math.random()*20+10, 0, Math.PI, true);
            ctx.fill();
        }
    } else if (zoneIndex === 1) { // Ice Peaks
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(0, Math.random()*256); ctx.lineTo(128, Math.random()*256); ctx.lineTo(256, Math.random()*256); ctx.stroke();
    } else if (zoneIndex === 2) { // Lava Ruins
        ctx.fillStyle = '#212121'; 
        ctx.fillRect(0,0,256,256);
        ctx.strokeStyle = '#ff9800'; 
        ctx.shadowColor = '#ff5722'; ctx.shadowBlur = 15;
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(80, 150); ctx.lineTo(180, 80); ctx.lineTo(256, 120); ctx.stroke();
    } else if (zoneIndex === 3) { // Sky
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for(let i=0; i<5; i++) {
            ctx.beginPath(); ctx.arc(Math.random()*256, Math.random()*256, Math.random()*40+30, 0, Math.PI*2); ctx.fill();
        }
    } else if (zoneIndex === 4) { // Neon
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20;
        ctx.strokeRect(10, 10, 236, 236);
    } else if (zoneIndex === 5) { // Crystal
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(256,256); ctx.moveTo(256,0); ctx.lineTo(0,256); ctx.stroke();
    } else if (zoneIndex === 6) { // Void
        ctx.fillStyle = '#ffffff';
        for(let i=0; i<30; i++) ctx.fillRect(Math.random()*256, Math.random()*256, 4, 4);
    } else if (zoneIndex === 7) { // Cyberpunk
        ctx.strokeStyle = '#e040fb'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(50,0); ctx.lineTo(50, 100); ctx.lineTo(150, 100); ctx.lineTo(150,256); ctx.stroke();
        ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(150, 100, 12, 0, Math.PI*2); ctx.fill();
    } else if (zoneIndex === 8) { // Cosmic
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for(let i=0; i<20; i++) {
            ctx.beginPath(); ctx.arc(Math.random()*256, Math.random()*256, Math.random()*3+1, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(156,39,176,0.3)';
        ctx.beginPath(); ctx.arc(128,128, 80, 0, Math.PI*2); ctx.fill();
    } else { // Temple
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 8;
        ctx.strokeRect(0,0,128,128); ctx.strokeRect(128,0,128,128);
        ctx.strokeRect(-64,128,128,128); ctx.strokeRect(64,128,128,128); ctx.strokeRect(192,128,128,128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    textureCache[key] = tex;
    return tex;
}

function getPlatformMaterials(y, colorHex, w, h, d) {
    const zoneObj = getZoneAtY(y);
    let zoneIndex = ZONES.indexOf(zoneObj);
    if(zoneIndex === -1) zoneIndex = Object.keys(ZONES).length - 1;

    const tex = generateZoneTexture(zoneIndex, colorHex);
    
    const texSide = tex.clone(); texSide.needsUpdate = true;
    const texTop = tex.clone(); texTop.needsUpdate = true;
    
    texTop.repeat.set(w / 4, d / 4);
    texSide.repeat.set(w / 4, h / 4);
    
    const matTop = new THREE.MeshToonMaterial({ map: texTop });
    const matSide = new THREE.MeshToonMaterial({ map: texSide });
    
    return [matSide, matSide, matTop, matTop, matSide, matSide];
}`);

// 3. Update buildPlatform
code = code.replace(/function buildPlatform\(x, y, z, w, h, d, color\) \{[\s\S]+?const mat = new THREE.MeshToonMaterial\(\{ color \}\);/, `function buildPlatform(x, y, z, w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mats = getPlatformMaterials(y, color, w, h, d);`);
code = code.replace('const mesh = new THREE.Mesh(geo, mat);', 'const mesh = new THREE.Mesh(geo, mats);');

// 4. Update buildMovingPlatform
code = code.replace(/function buildMovingPlatform\(def\) \{[\s\S]+?const mat = new THREE.MeshToonMaterial\(\{ color: def.color \|\| 0x888888 \}\);/, `function buildMovingPlatform(def) {
    const geo = new THREE.BoxGeometry(def.w, def.h, def.d);
    const mats = getPlatformMaterials(def.start[1], def.color || 0x888888, def.w, def.h, def.d);`);
code = code.replace('const mesh = new THREE.Mesh(geo, mat);', 'const mesh = new THREE.Mesh(geo, mats);'); // It should replace the next one

// 5. Update loadTower
code = code.replace(/function loadTower\(\) \{/, 'function loadTower(index = 0) { currentTowerIndex = index; const currentTower = TOWERS[currentTowerIndex];');
code = code.replace(/TOWER\.platforms/g, 'currentTower.platforms');
code = code.replace(/TOWER\.movingPlatforms/g, '(currentTower.movingPlatforms || [])');
code = code.replace(/TOWER\.goalPos/g, 'currentTower.goalPos');
code = code.replace(/TOWER\.spawn/g, 'currentTower.spawn');

// 6. triggerWin update
code = code.replace(/loadTower\(\);/, 'loadTower(currentTowerIndex);');

fs.writeFileSync('c:/Users/e_art/OneDrive/Desktop/Antigravityplatformer/script.js', code);
console.log("SUCCESS");
