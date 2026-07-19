const fs = require('fs');

let src = fs.readFileSync('script.js', 'utf8');

// 1. Remove ZONES and TOWER definitions
src = src.replace(/\/\/ ── ZONE 1:[\s\S]*?movingPlatforms: \[\s*\]?,?/g, ''); // Clear old platforms
src = src.replace(/const ZONES = \[\s*\{[\s\S]*?\];/g, '');
src = src.replace(/const TOWER = \{[\s\S]*?\}\s*\]\s*,?\s*\};?/g, '');
// Just completely remove the ZONES and TOWER constants, we'll manually patch the references next


// 2. Add droppingPlatformObjects and gameMode globals near the TOWER STATE
src = src.replace(/let levelObjects = \[\];/, 
`let gameMode = '3D';
let currentTowerIndex = 0;
let levelObjects = [];
let droppingPlatformObjects = [];`);

// 3. Patch loadTower function
src = src.replace(/function loadTower\(\) \{[\s\S]*?clearTower\(\);/g, 
`function loadTower() {
    clearTower();
    const towerDef = TOWERS[currentTowerIndex];`);

// Fix the startZone reference
src = src.replace(/const startZone = ZONES\[0\];/g, `const startZone = ZONES[0];`);
    
// Replace TOWER. with towerDef.
src = src.replace(/TOWER\./g, 'towerDef.');

// Inject dropping platforms compilation
src = src.replace(/for \(const def of towerDef\.movingPlatforms\) \{[\s\S]*?\}/g, 
`for (const def of towerDef.movingPlatforms||[]) {
        buildMovingPlatform(def);
    }
    for (const def of towerDef.droppingPlatforms||[]) {
        buildDroppingPlatform(def);
    }`);

// Also clear dropping platforms
src = src.replace(/movingPlatformObjects = \[\];/g, 
`movingPlatformObjects = [];
    droppingPlatformObjects = [];`);

// Add buildDroppingPlatform
let droppingFunction = `
function buildDroppingPlatform(def) {
    const geo = new THREE.BoxGeometry(def[3], def[4], def[5]);
    const mat = new THREE.MeshToonMaterial({ color: def[6] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(def[0], def[1], def[2]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const outMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    const outline = new THREE.Mesh(geo, outMat);
    const t = 0.14; outline.scale.set(1 + t/def[3], 1 + t/def[4], 1 + t/def[5]);
    mesh.add(outline);
    scene.add(mesh);
    levelObjects.push(mesh);
    droppingPlatformObjects.push({ mesh, startPos: mesh.position.clone(), state: 'stable', timer: 0, velY: 0 });
}

function updateDroppingPlatforms(dt) {
    for (const dp of droppingPlatformObjects) {
        if (dp.state === 'shaking') {
            dp.timer += dt;
            dp.mesh.position.set(
                dp.startPos.x + (Math.random() - 0.5) * 0.1,
                dp.startPos.y,
                dp.startPos.z + (Math.random() - 0.5) * 0.1
            );
            if (dp.timer > 0.8) {
                dp.state = 'falling';
                dp.timer = 0;
                // Remove from levelObjects so player falls through
                const idx = levelObjects.indexOf(dp.mesh);
                if (idx > -1) levelObjects.splice(idx, 1);
            }
        } else if (dp.state === 'falling') {
            dp.velY += GRAVITY * dt;
            dp.mesh.position.y += dp.velY * dt;
            if (dp.mesh.position.y < dp.startPos.y - 30) {
                dp.state = 'hidden';
                dp.mesh.visible = false;
                dp.timer = 0;
            }
        } else if (dp.state === 'hidden') {
            dp.timer += dt;
            if (dp.timer > 5.0) {
                dp.state = 'stable';
                dp.mesh.position.copy(dp.startPos);
                dp.mesh.visible = true;
                dp.velY = 0;
                dp.timer = 0;
                levelObjects.push(dp.mesh);
            }
        }
    }
}
`;
src = src.replace(/function buildPlatform/g, droppingFunction + '\nfunction buildPlatform');

// 4. Implement Drop trigger
src = src.replace(/const hitMesh = hits\[0\]\.object;/g, 
`const hitMesh = hits[0].object;
        for (const dp of droppingPlatformObjects) {
            if (dp.mesh === hitMesh || hitMesh.parent === dp.mesh) {
                if (dp.state === 'stable') { dp.state = 'shaking'; dp.timer = 0; }
                break;
            }
        }`);

// 5. Setup Menu overlays
let bootLogic = `
window.addEventListener('keydown', (e) => {
    // Let select boxes work
    if (e.target.tagName === 'SELECT') return;
});

const towerSelect = document.getElementById('tower-select');
const modeSelect = document.getElementById('mode-select');

showLevelOverlay('🏆 Tower Climb', '🎮 Start Climbing!', () => {
    if (towerSelect) currentTowerIndex = parseInt(towerSelect.value);
    if (modeSelect) gameMode = modeSelect.value;
    
    // Setup player 2
    if (gameMode === '2D' && typeof player2 !== 'undefined') {
        player2.visible = true;
        p2State.active = true;
    } else if (typeof player2 !== 'undefined') {
        player2.visible = false;
        p2State.active = false;
    }

    loadTower();
});
`;
src = src.replace(/showLevelOverlay\([\s\S]*?loadTower\(\);\s*}\);/g, bootLogic);

// 6. Camera 2D logic
src = src.replace(/function updateOrbitCamera\(playerPos\) \{/g, 
`function updateOrbitCamera(playerPos) {
    if (gameMode === '2D') {
        // fixed view from side
        const midPoint = playerPos.clone();
        if (typeof p2State !== 'undefined' && p2State.active) {
             midPoint.add(p2State.mesh.position).multiplyScalar(0.5);
        }
        camera.position.set(midPoint.x + 20, midPoint.y + 4, midPoint.z);
        camera.lookAt(midPoint);
        return;
    }`);

// 7. Extract Player Update Logic into Class/Object Array
// This is the hardest part. I will output a new JS file to reconstruct the remaining physics correctly.
// Let's do that!

fs.writeFileSync('script.js', src, 'utf8');
console.log('Script updated with baseline globals, dropping platforms, UI hooks, and camera 2D.');
