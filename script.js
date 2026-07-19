// ─────────────────────────────────────────────────────────
//  SCENE SETUP
//  THREE is provided as a UMD global from three.min.js
// ─────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const fogColor = new THREE.Color('#fcebc7');
scene.background = fogColor;
scene.fog = new THREE.FogExp2(fogColor, 0.018);

// ─────────────────────────────────────────────────────────
//  GAME MODE ENUM
// ─────────────────────────────────────────────────────────
let GAME_MODE = '3D_SOLO';

// ─────────────────────────────────────────────────────────
//  CAMERAS
// ─────────────────────────────────────────────────────────
const camera1 = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 500);
const camera2 = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 500);
// Default single player uses camera1
let camera = camera1;
camera.position.set(0, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Fix for scissor test
renderer.setScissorTest(false);
document.body.appendChild(renderer.domElement);

// --- SHARED GEOMETRIES FOR PERFORMANCE (DEFINED EARLY) ---
const particleSphereGeo = new THREE.SphereGeometry(0.25, 6, 6);
const particleBoxGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const particleOctGeo = new THREE.OctahedronGeometry(0.4, 0);
const particleHexGeo = new THREE.IcosahedronGeometry(0.28, 0);
const particleSoftSphere = new THREE.SphereGeometry(0.7, 6, 6);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff5cc, 1.1);
dirLight.position.set(25, 50, 25);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────
function addOutline(mesh, geo, scale = 1.07) {
    const outMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    const outline = new THREE.Mesh(geo, outMat);
    outline.scale.setScalar(scale);
    mesh.add(outline);
}

// ─────────────────────────────────────────────────────────
//  PLAYERS
// ─────────────────────────────────────────────────────────
const capsuleGeo = new THREE.CapsuleGeometry(0.45, 0.9, 4, 16);
const p1Mat = new THREE.MeshToonMaterial({ color: 0xd92b2b }); // Red
const p2Mat = new THREE.MeshToonMaterial({ color: 0x2b82d9 }); // Blue

function createPlayerMeshes(mat) {
    const pMesh = new THREE.Mesh(capsuleGeo, mat);
    pMesh.castShadow = true;
    addOutline(pMesh, capsuleGeo, 1.08);
    
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.13, 8, 8);
    const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeBlack = new THREE.MeshBasicMaterial({ color: 0x111111 });
    [-0.18, 0.18].forEach(xOff => {
        const eye = new THREE.Mesh(eyeGeo, eyeWhite);
        eye.position.set(xOff, 0.42, 0.4);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07), eyeBlack);
        pupil.position.set(0, 0, 0.11);
        eye.add(pupil);
        pMesh.add(eye);
    });

    // Hands
    const handGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const handMat = mat.clone();
    const lHand = new THREE.Mesh(handGeo, handMat);
    const rHand = new THREE.Mesh(handGeo, handMat);
    lHand.visible = false; rHand.visible = false;
    scene.add(lHand); scene.add(rHand);

    scene.add(pMesh);
    return { mesh: pMesh, lHand, rHand };
}

const p1Obj = createPlayerMeshes(p1Mat);
const p2Obj = createPlayerMeshes(p2Mat);
// Hide p2 by default
p2Obj.mesh.visible = false;

// We map physics state into an object so we can use a pure update function
function createPhysicsState(pObj) {
    return {
        mesh: pObj.mesh,
        lHand: pObj.lHand,
        rHand: pObj.rHand,
        velocity: new THREE.Vector3(),
        isGrounded: false,
        lastPlatform: null,
        jumpsRemaining: 2,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        lookTimer: 0,
        dynamicRadius: 2,
        isGrabbing: false,
        grabCooldown: 0,
        ledgeNormal: new THREE.Vector3(),
        isPullingUp: false,
        pullUpTimer: 0,
        pullUpStartPos: new THREE.Vector3(),
        pullUpEndPos: new THREE.Vector3(),
        ledgeHangTime: 0,
    };
}
const p1State = createPhysicsState(p1Obj);
const p2State = createPhysicsState(p2Obj);

// ─────────────────────────────────────────────────────────
//  MANUAL ORBIT CAMERA  (for 3D mode)
// ─────────────────────────────────────────────────────────
const orbit = {
    theta: 0, phi: 0.3, radius: 12,
    minPhi: -Math.PI / 2 + 0.05, maxPhi: Math.PI / 2 - 0.05,
    minRadius: 0.5, maxRadius: 28,
    isFirstPerson: false, dragging: false,
    lastX: 0, lastY: 0, target: new THREE.Vector3(),
};

renderer.domElement.addEventListener('mousedown', e => {
    orbit.dragging = true; orbit.lastX = e.clientX; orbit.lastY = e.clientY;
});
window.addEventListener('mouseup', () => { orbit.dragging = false; });
window.addEventListener('mousemove', e => {
    if (!orbit.dragging && !orbit.isFirstPerson) return;
    if (GAME_MODE === '2D_RACE') return; // Cannot rotate in 2D mode
    const dx = e.movementX || e.clientX - orbit.lastX;
    const dy = e.movementY || e.clientY - orbit.lastY;
    orbit.lastX = e.clientX; orbit.lastY = e.clientY;
    
    // Lower sensitivity for a smoother experience
    const sensitivity = orbit.isFirstPerson ? 0.003 : 0.006;
    orbit.theta -= dx * sensitivity;
    orbit.phi -= dy * sensitivity;
    orbit.phi = Math.max(orbit.minPhi, Math.min(orbit.maxPhi, orbit.phi));
});
renderer.domElement.addEventListener('wheel', e => {
    if (GAME_MODE === '2D_RACE') {
        // Zooming out in 2D race
        orbit.radius *= (1 + e.deltaY * 0.0012);
        orbit.radius = Math.max(8, Math.min(40, orbit.radius));
        return;
    }
    orbit.radius *= (1 + e.deltaY * 0.0012);
    if (orbit.radius < 1.0 && !orbit.isFirstPerson) enterFirstPerson();
    else if (orbit.radius > 1.0 && orbit.isFirstPerson) exitFirstPerson();
    orbit.radius = Math.max(orbit.minRadius, Math.min(orbit.maxRadius, orbit.radius));
}, { passive: true });

function enterFirstPerson() {
    orbit.isFirstPerson = true; orbit.radius = 0.5; 
    renderer.domElement.requestPointerLock();
    p1Obj.mesh.visible = false;
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.display = 'block';
}

function exitFirstPerson() {
    orbit.isFirstPerson = false; orbit.radius = 1.5;
    document.exitPointerLock?.();
    p1Obj.mesh.visible = true;
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.display = 'none';
}

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement && orbit.isFirstPerson) exitFirstPerson();
});

function updateOrbitCamera(cam, focusMesh, isPlayer2 = false) {
    if (GAME_MODE === '2D_RACE') {
        const targetPos = focusMesh.position.clone().add(new THREE.Vector3(0, 2, 0));
        cam.position.copy(targetPos).add(new THREE.Vector3(0, 2, orbit.radius + 10));
        cam.lookAt(targetPos);
        return;
    }

    if (orbit.isFirstPerson) {
        const headPos = focusMesh.position.clone().add(new THREE.Vector3(0, 0.6, 0));
        cam.position.copy(headPos);
        // Calculate look vector based on theta (yaw) and phi (pitch)
        const lookTarget = new THREE.Vector3(
            Math.sin(orbit.theta) * Math.cos(orbit.phi),
            Math.sin(orbit.phi),
            Math.cos(orbit.theta) * Math.cos(orbit.phi)
        );
        cam.lookAt(headPos.clone().add(lookTarget));
    } else {
        orbit.target.lerp(focusMesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.1);
        // Position camera in spherical coordinates around the target
        // Negate sin(phi) in 3rd person so Mouse UP = Look UP (camera moves DOWN)
        cam.position.x = orbit.target.x + orbit.radius * Math.sin(orbit.theta) * Math.cos(orbit.phi);
        cam.position.y = orbit.target.y - orbit.radius * Math.sin(orbit.phi);
        cam.position.z = orbit.target.z + orbit.radius * Math.cos(orbit.theta) * Math.cos(orbit.phi);
        cam.lookAt(orbit.target);
    }
}

// ─────────────────────────────────────────────────────────
//  TOWER STATE
// ─────────────────────────────────────────────────────────
let levelObjects = [];
let goalMesh = null;
let goalParticles = [];
let particlesGroup, particlePool = [], lastParticleZone = -1;
const PARTICLE_COUNT = 160;
const PARTICLE_BOUNDS = 45; // follow distance box
let movingPlatformObjects = [];
let backgroundGroup = null;
let currentTowerIndex = 0;

const textureCache = {};
function generateZoneTexture(zoneIndex, baseColorHex) {
    const key = zoneIndex + '_' + baseColorHex;
    if (textureCache[key]) return textureCache[key];

    const canvas = document.createElement('canvas'); // Color map
    const bCanvas = document.createElement('canvas'); // Bump map
    canvas.width = 512; canvas.height = 512; // Increased res
    bCanvas.width = 512; bCanvas.height = 512;

    const ctx = canvas.getContext('2d');
    const bCtx = bCanvas.getContext('2d');

    ctx.fillStyle = '#' + baseColorHex.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 512, 512);
    bCtx.fillStyle = '#000000';
    bCtx.fillRect(0, 0, 512, 512);

    ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    bCtx.lineWidth = 16; bCtx.lineCap = 'round'; bCtx.lineJoin = 'round';

    function draw(x, y, rad, color, bumpValue) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI*2); ctx.fill();
        bCtx.fillStyle = bumpValue; bCtx.beginPath(); bCtx.arc(x, y, rad, 0, Math.PI*2); bCtx.fill();
    }
    function stroke(color, bumpValue, pathFunc) {
        ctx.strokeStyle = color; ctx.beginPath(); pathFunc(ctx); ctx.stroke();
        bCtx.strokeStyle = bumpValue; bCtx.beginPath(); pathFunc(bCtx); bCtx.stroke();
    }
    function fillRect(color, bumpValue, px, py, w, h) {
        ctx.fillStyle = color; ctx.fillRect(px,py,w,h);
        bCtx.fillStyle = bumpValue; bCtx.fillRect(px,py,w,h);
    }
    function strokeRect(color, bumpValue, px, py, w, h) {
        ctx.strokeStyle = color; ctx.strokeRect(px,py,w,h);
        bCtx.strokeStyle = bumpValue; bCtx.strokeRect(px,py,w,h);
    }

    // Increased detail size "more complicated and more large"
    if (zoneIndex === 0) { // Grassy - draw blade-like shapes
        for(let i=0; i<80; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const h = Math.random() * 40 + 20;
            const w = Math.random() * 10 + 5;
            ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#388e3c';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + w, y - h/2, x, y - h);
            ctx.quadraticCurveTo(x - w, y - h/2, x, y);
            ctx.fill();
        }
    } else if (zoneIndex === 1) { // Ice Peaks
        stroke('rgba(255,255,255,0.7)', '#ffffff', c => { c.moveTo(0, Math.random()*512); c.lineTo(256, Math.random()*512); c.lineTo(512, Math.random()*512); });
    } else if (zoneIndex === 2) { // Lava Ruins - Hexagons with glowing cracks
        fillRect('#212121', '#000000', 0, 0, 512, 512); // Base dark rock
        ctx.strokeStyle = '#ff5722'; ctx.lineWidth = 10;
        ctx.shadowColor = '#ff9800'; ctx.shadowBlur = 15;
        // Draw a hexagonal grid of cracks
        const size = 64;
        for (let gy = -size; gy < 512 + size; gy += size * 1.5) {
            for (let gx = -size; gx < 512 + size; gx += size * Math.sqrt(3)) {
                const off = (Math.floor(gy / (size * 1.5)) % 2) * (size * Math.sqrt(3) / 2);
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3;
                    const px = gx + off + size * Math.cos(angle);
                    const py = gy + size * Math.sin(angle);
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
    } else if (zoneIndex === 3) { // Sky Kingdom - Soft fluffy clouds
        fillRect('#f0f4f8', '#000000', 0, 0, 512, 512); 
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for(let i=0; i<30; i++) {
            const size = Math.random() * 80 + 40;
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
        }
    } else if (zoneIndex === 4) { // Neon - Japan Cyberpunk Tech Grid
        fillRect('#1a0533', '#000000', 0, 0, 512, 512); // Deep purple base
        ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 4;
        ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 15;
        // Tech Grid
        for(let i=0; i<512; i+=64) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        // Glowing Circuit Chips
        ctx.strokeStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff';
        for(let i=0; i<12; i++) {
            const rx = Math.random()*400, ry = Math.random()*400;
            ctx.strokeRect(rx, ry, 40, 20);
            fillRect('#ff00ff', '#ff00ff', rx+10, ry+5, 20, 10);
        }
        ctx.shadowBlur = 0;
    } else if (zoneIndex === 5) { // Crystal - Rocky texture
        fillRect('#5d4037', '#3e2723', 0, 0, 512, 512); // Dusty brown rock
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        for(let i=0; i<40; i++) {
            ctx.beginPath(); ctx.moveTo(Math.random()*512, Math.random()*512); ctx.lineTo(Math.random()*512, Math.random()*512); ctx.stroke();
        }
    } else if (zoneIndex === 6) { // Void
        for(let i=0; i<60; i++) fillRect('#ffffff', '#ffffff', Math.random()*512, Math.random()*512, 10, 10);
    } else if (zoneIndex === 7) { // Steampunk District (Floor 8)
        fillRect('#b87333', '#000000', 0, 0, 512, 512); // Bronze base
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 15;
        // Rivets/Gears patterns
        for(let i=0; i<8; i++) {
            ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*512, 40, 0, Math.PI*2); ctx.stroke();
        }
        for(let i=0; i<30; i++) fillRect('#ffd700', '#ffffff', Math.random()*512, Math.random()*512, 8, 8); // Rivets
    } else if (zoneIndex === 8) { // Cosmic Dreamscape (Floor 9)
        fillRect('#120b2e', '#000000', 0, 0, 512, 512); // Deep space purple
        // Nebula swirls
        for(let i=0; i<20; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = Math.random() * 60 + 30;
            const hue = Math.random() > 0.5 ? '140, 80, 200' : '80, 120, 255';
            ctx.fillStyle = `rgba(${hue}, ${0.12 + Math.random() * 0.15})`;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        }
        // Stars
        for(let i=0; i<60; i++) {
            const brightness = 150 + Math.floor(Math.random() * 105);
            fillRect(`rgb(${brightness},${brightness},${brightness + 20})`, '#ffffff', Math.random()*512, Math.random()*512, 3 + Math.random()*3, 3 + Math.random()*3);
        }
    } else if (zoneIndex === 9) { // Ancient Temple - Brick pattern
        fillRect('#6d4c2f', '#3e2c1a', 0, 0, 512, 512); // Sandy brown base
        const brickW = 64, brickH = 32;
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3;
        bCtx.strokeStyle = '#333333'; bCtx.lineWidth = 3;
        for (let row = 0; row < 512 / brickH; row++) {
            const offset = (row % 2 === 0) ? 0 : brickW / 2;
            for (let col = -1; col < 512 / brickW + 1; col++) {
                const bx = col * brickW + offset;
                const by = row * brickH;
                // Slight color variation per brick
                const shade = 0.85 + Math.random() * 0.3;
                ctx.fillStyle = `rgb(${Math.floor(109*shade)},${Math.floor(76*shade)},${Math.floor(47*shade)})`;
                ctx.fillRect(bx+2, by+2, brickW-4, brickH-4);
                ctx.strokeRect(bx, by, brickW, brickH);
                bCtx.strokeRect(bx, by, brickW, brickH);
            }
        }
        // Aging: random dark splotches
        for(let i=0; i<25; i++) {
            ctx.fillStyle = `rgba(30,15,5,${0.1 + Math.random() * 0.15})`;
            ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*512, Math.random()*20+8, 0, Math.PI*2); ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    const bTex = new THREE.CanvasTexture(bCanvas);
    bTex.wrapS = THREE.RepeatWrapping; bTex.wrapT = THREE.RepeatWrapping;

    const res = { map: tex, bumpMap: bTex };
    textureCache[key] = res;
    return res;
}

function getPlatformMaterials(y, colorHex, w, h, d) {
    const zoneObj = getZoneAtY(y);
    let zoneIndex = ZONES.indexOf(zoneObj);
    if(zoneIndex === -1) zoneIndex = Object.keys(ZONES).length - 1;

    const textures = generateZoneTexture(zoneIndex, colorHex);
    
    const texSide = textures.map.clone(); texSide.needsUpdate = true;
    const texTop = textures.map.clone(); texTop.needsUpdate = true;
    const bumpSide = textures.bumpMap.clone(); bumpSide.needsUpdate = true;
    const bumpTop = textures.bumpMap.clone(); bumpTop.needsUpdate = true;
    
    // Scale made more large
    texTop.repeat.set(w / 8, d / 8); bumpTop.repeat.set(w / 8, d / 8);
    texSide.repeat.set(w / 8, h / 8); bumpSide.repeat.set(w / 8, h / 8);
    
    // Intense 3d depth bump scale
    let bScale = 0.65;
    if (zoneIndex === 9) bScale = 1.8; // Deep cracks in temple
    const matTop = new THREE.MeshToonMaterial({ map: texTop, bumpMap: bumpTop, bumpScale: zoneIndex === 9 ? 2.5 : 1.2 });
    const matSide = new THREE.MeshToonMaterial({ map: texSide, bumpMap: bumpSide, bumpScale: bScale });
    
    return [matSide, matSide, matTop, matTop, matSide, matSide];
}
const currentSkyColor = new THREE.Color('#fcebc7'); // live interpolated color
// NOTE: ZONES and TOWERS are defined in towers.js (loaded before this script)

function getZoneAtY(y) {
    for (let i = ZONES.length - 1; i >= 0; i--) {
        if (y >= ZONES[i].minY) return ZONES[i];
    }
    return ZONES[0];
}

function clearTower() {
    for (const obj of levelObjects) scene.remove(obj);
    levelObjects = [];
    if (goalMesh) { scene.remove(goalMesh); goalMesh = null; }
    for (const p of goalParticles) scene.remove(p);
    goalParticles = [];
    
    // Fix: Properly remove moving platforms from scene
    for (const item of movingPlatformObjects) scene.remove(item.mesh);
    movingPlatformObjects = [];

    if (backgroundGroup) { scene.remove(backgroundGroup); backgroundGroup = null; }
    if (groundMesh) { scene.remove(groundMesh); groundMesh = null; }
}

function addSteampunkDetailsToPlatform(mesh, w, h, d) {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.8, roughness: 0.2 });
    
    // 3D Gears on sides
    const gearGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 12);
    const gearsCount = Math.floor(w * d * 0.15) + 3;
    for (let i = 0; i < gearsCount; i++) {
        const gear = new THREE.Mesh(gearGeo, goldMat);
        const side = Math.random() > 0.5 ? 1 : -1;
        const tx = (Math.random() - 0.5) * w;
        const ty = (Math.random() - 0.5) * (h * 0.5);
        gear.position.set(tx, ty, (d/2 + 0.05) * side);
        gear.rotation.set(Math.PI/2, Math.random() * Math.PI, 0);
        gear.userData.rotSpeed = (Math.random() - 0.5) * 5;
        mesh.add(gear);
    }
    
    // Ornate Bronze Pipes
    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, w, 8);
    const pipe = new THREE.Mesh(pipeGeo, bronzeMat);
    pipe.rotation.z = Math.PI/2;
    pipe.position.set(0, -h/2 - 0.1, (d/2 - 0.2));
    mesh.add(pipe);
    const pipe2 = pipe.clone();
    pipe2.position.z = - (d/2 - 0.2);
    mesh.add(pipe2);
}

function addGrassToPlatform(mesh, w, h, d) {
    const grassCount = Math.floor(w * d * 2.5);
    const grassGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.4, 3);
    const grassMat = new THREE.MeshToonMaterial({ color: 0x4caf50 });
    
    for (let i = 0; i < grassCount; i++) {
        const blade = new THREE.Mesh(grassGeo, grassMat);
        const tx = (Math.random() - 0.5) * (w - 0.2);
        const tz = (Math.random() - 0.5) * (d - 0.2);
        blade.position.set(tx, h/2 + 0.15, tz);
        blade.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
        blade.scale.y = 0.5 + Math.random() * 1.2;
        mesh.add(blade);
    }
}

function addIceToPlatform(mesh, w, h, d) {
    // Icicles underneath
    const icicleCount = Math.floor(w * d * 0.8);
    const iceGeo = new THREE.ConeGeometry(0.15, 0.8, 4);
    const iceMat = new THREE.MeshToonMaterial({ color: 0xbbdefb, transparent: true, opacity: 0.9 });
    
    for (let i = 0; i < icicleCount; i++) {
        const icicle = new THREE.Mesh(iceGeo, iceMat);
        const tx = (Math.random() - 0.5) * (w - 0.3);
        const tz = (Math.random() - 0.5) * (d - 0.3);
        const length = 0.5 + Math.random() * 1.2;
        icicle.position.set(tx, -h/2 + 0.1, tz);
        icicle.rotation.x = Math.PI; // point down
        icicle.scale.set(1 + Math.random(), length, 1 + Math.random());
        mesh.add(icicle);
    }
    
    // Snow mounds on top
    const moundCount = Math.floor(w * d * 0.3);
    const moundGeo = new THREE.SphereGeometry(0.3, 6, 6);
    const moundMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    for (let i = 0; i < moundCount; i++) {
        const mound = new THREE.Mesh(moundGeo, moundMat);
        const tx = (Math.random() - 0.5) * (w - 0.4);
        const tz = (Math.random() - 0.5) * (d - 0.4);
        mound.position.set(tx, h/2 - 0.1, tz);
        mound.scale.set(1 + Math.random() * 2, 0.4 + Math.random() * 0.6, 1 + Math.random() * 2);
        mound.rotation.y = Math.random() * Math.PI;
        mesh.add(mound);
    }
}

function addLavaToPlatform(mesh, w, h, d) {
    const rockCount = Math.floor(w * d * 0.8);
    const rockMat = new THREE.MeshToonMaterial({ color: 0x222222 });
    
    for (let i = 0; i < rockCount; i++) {
        const sides = Math.random() > 0.5 ? 6 : 8;
        const radius = 0.2 + Math.random() * 0.6;
        const rockGeo = new THREE.CylinderGeometry(radius, radius * 0.9, 0.2, sides);
        const rock = new THREE.Mesh(rockGeo, rockMat);
        
        const tx = (Math.random() - 0.5) * (w - 0.5);
        const tz = (Math.random() - 0.5) * (d - 0.5);
        rock.position.set(tx, h/2 - 0.05, tz);
        rock.rotation.y = Math.random() * Math.PI;
        rock.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 1.5, 1 + Math.random() * 0.5);
        mesh.add(rock);
    }

    // Add subtle lava drips
    const dripCount = Math.floor(w * d * 0.15) + 2;
    const dripMat = new THREE.MeshToonMaterial({ color: 0xff5722, emissive: 0xff9800, emissiveIntensity: 0.5 });
    const dripGeo = new THREE.CylinderGeometry(0.06, 0.02, 0.5, 4);
    for (let i = 0; i < dripCount; i++) {
        const drip = new THREE.Mesh(dripGeo, dripMat);
        const side = Math.floor(Math.random() * 4);
        let tx = 0, tz = 0, ty = (Math.random() - 0.5) * h;
        if (side === 0) { tx = (Math.random() - 0.5) * w; tz = d/2 + 0.02; }
        else if (side === 1) { tx = (Math.random() - 0.5) * w; tz = -d/2 - 0.02; }
        else if (side === 2) { tx = w/2 + 0.02; tz = (Math.random() - 0.5) * d; }
        else { tx = -w/2 - 0.02; tz = (Math.random() - 0.5) * d; }
        
        drip.position.set(tx, ty - 0.2, tz);
        drip.scale.y = 0.5 + Math.random() * 1.5;
        mesh.add(drip);
    }
}

function addCloudToPlatform(mesh, w, h, d) {
    const cloudCount = Math.floor(w * d * 0.8) + 12;
    const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const sphereGeo = new THREE.SphereGeometry(0.8, 8, 8);
    
    for (let i = 0; i < cloudCount; i++) {
        const cloud = new THREE.Mesh(sphereGeo, cloudMat);
        const tx = (Math.random() - 0.5) * (w + 0.8);
        const tz = (Math.random() - 0.5) * (d + 0.8);
        const ty = (Math.random() - 0.5) * (h * 0.6);
        cloud.position.set(tx, ty, tz);
        cloud.scale.set(1.2 + Math.random(), 0.8 + Math.random() * 0.4, 1.2 + Math.random());
        cloud.rotation.y = Math.random() * Math.PI;
        mesh.add(cloud);
    }
}

function addNeonToPlatform(mesh, w, h, d) {
    // Hanging lanterns logic only - Vertical rectangles removed
    const lanternCount = Math.floor(w * d * 0.15) + 2;
    const lanternGeo = new THREE.BoxGeometry(0.35, 0.55, 0.35);
    const lightMat = new THREE.MeshToonMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x333333 });

    for (let i = 0; i < lanternCount; i++) {
        const lantern = new THREE.Mesh(lanternGeo, lightMat);
        const tx = (Math.random() - 0.5) * (w - 0.4);
        const tz = (Math.random() - 0.5) * (d - 0.4);
        lantern.position.set(tx, -h/2 - 0.5, tz);
        mesh.add(lantern);
        const wireGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(tx, -h/2, tz), new THREE.Vector3(tx, -h/2 - 0.3, tz)]);
        mesh.add(new THREE.Line(wireGeo, wireMat));
    }
}

function addCrystalsToPlatform(mesh, w, h, d) {
    // Reduced count (was w*d*0.5+6) and removed PointLights — both were major FPS killers on floor 6
    const crystalCount = Math.floor(w * d * 0.1) + 2;
    const crystalColors = [0x9c27b0, 0x2196f3, 0x00bcd4]; // Purple, Blue, Cyan
    const octGeo = new THREE.OctahedronGeometry(0.35, 0);
    
    for (let i = 0; i < crystalCount; i++) {
        const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
        // MeshToonMaterial instead of MeshStandard — much cheaper, still looks good
        const mat = new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
        const crystal = new THREE.Mesh(octGeo, mat);
        
        const tx = (Math.random() - 0.5) * (w - 0.4);
        const tz = (Math.random() - 0.5) * (d - 0.4);
        crystal.position.set(tx, h/2 + 0.1, tz);
        crystal.scale.set(0.6 + Math.random() * 0.8, 1.2 + Math.random() * 1.5, 0.6 + Math.random() * 0.8);
        crystal.rotation.set(Math.random()*0.4, Math.random()*Math.PI, Math.random()*0.4);
        mesh.add(crystal);
        // PointLights removed — they were being added per crystal across many platforms
    }
}

function buildPlatform(x, y, z, w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mats = getPlatformMaterials(y, color, w, h, d);
    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const outMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    const outline = new THREE.Mesh(geo, outMat);
    const t = 0.14;
    outline.scale.set(1 + t / w, 1 + t / h, 1 + t / d);
    mesh.add(outline);

    // Add environmental decorations based on zone (Solo mode only)
    const zone = getZoneAtY(y);
    const zoneIndex = ZONES.indexOf(zone);
    
    if (GAME_MODE !== '2D_RACE') {
        if (zoneIndex === 0) addGrassToPlatform(mesh, w, h, d);
        else if (zoneIndex === 1) addIceToPlatform(mesh, w, h, d);
        else if (zoneIndex === 2) addLavaToPlatform(mesh, w, h, d);
        else if (zoneIndex === 3) {
            mesh.material.forEach(m => m.visible = false);
            outline.visible = false; // Softer cloud look
            addCloudToPlatform(mesh, w, h, d);
        } else if (zoneIndex === 4) addNeonToPlatform(mesh, w, h, d);
        else if (zoneIndex === 5) addCrystalsToPlatform(mesh, w, h, d);
        else if (zoneIndex === 7) addSteampunkDetailsToPlatform(mesh, w, h, d);
    }

    mesh.userData.zoneIndex = zoneIndex;
    scene.add(mesh);
    levelObjects.push(mesh);
    return mesh;
}

function buildMovingPlatform(def) {
    const geo = new THREE.BoxGeometry(def.w, def.h, def.d);
    const mats = getPlatformMaterials(def.start[1], def.color || 0xcccccc, def.w, def.h, def.d);
    const mesh = new THREE.Mesh(geo, mats);
    mesh.castShadow = true; mesh.receiveShadow = true;

    const outlineGeo = new THREE.BoxGeometry(def.w, def.h, def.d);
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    const outline = new THREE.Mesh(outlineGeo, outlineMat);
    const t = 0.15; outline.scale.set(1 + t/def.w, 1 + t/def.h, 1 + t/def.d);
    mesh.add(outline);

    const zone = getZoneAtY(def.start[1]);
    const zoneIndex = ZONES.indexOf(zone);
    if (GAME_MODE !== '2D_RACE') {
        if (zoneIndex === 0) addGrassToPlatform(mesh, def.w, def.h, def.d);
        else if (zoneIndex === 1) addIceToPlatform(mesh, def.w, def.h, def.d);
        else if (zoneIndex === 2) addLavaToPlatform(mesh, def.w, def.h, def.d);
        else if (zoneIndex === 3) {
            mesh.material.forEach(m => m.visible = false);
            outline.visible = false;
            addCloudToPlatform(mesh, def.w, def.h, def.d);
        } else if (zoneIndex === 4) addNeonToPlatform(mesh, def.w, def.h, def.d);
        else if (zoneIndex === 5) addCrystalsToPlatform(mesh, def.w, def.h, def.d);
        else if (zoneIndex === 7) addSteampunkDetailsToPlatform(mesh, def.w, def.h, def.d);
        else if (zoneIndex === 9) addTempleDetailsToPlatform(mesh, def.w, def.h, def.d);
    }
    mesh.userData.zoneIndex = zoneIndex;
    scene.add(mesh);
    levelObjects.push(mesh);
    const startV = new THREE.Vector3(...def.start);
    const endV = new THREE.Vector3(...def.end);
    movingPlatformObjects.push({ mesh, start: startV, end: endV, speed: def.speed || 2, t: 0, dir: 1, delta: new THREE.Vector3() });
}

function buildGoalStar(pos) {
    const starGeo = new THREE.OctahedronGeometry(0.85, 0); // slightly bigger yellow diamond
    const starMat = new THREE.MeshToonMaterial({ color: 0xffd700, emissive: 0xffa000, emissiveIntensity: 0.6 });
    goalMesh = new THREE.Mesh(starGeo, starMat);
    goalMesh.position.copy(pos).add(new THREE.Vector3(0, 2.2, 0));
    goalMesh.frustumCulled = false; // guarantee it renders no matter the camera angle!
    goalMesh.visible = true;
    addOutline(goalMesh, starGeo, 1.12);
    scene.add(goalMesh);

    const pLight = new THREE.PointLight(0xffd700, 2, 8);
    goalMesh.add(pLight);

    for (let i = 0; i < 12; i++) {
        const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffe57f });
        const p = new THREE.Mesh(pGeo, pMat);
        p.userData.angle = (i / 12) * Math.PI * 2;
        p.userData.radius = 1.2 + Math.random() * 0.5;
        p.userData.speed = 0.8 + Math.random() * 0.5;
        p.userData.yOff = Math.sin(i) * 0.5;
        goalMesh.add(p);
        goalParticles.push(p);
    }
}


function initParticleSystem() {
    particlesGroup = new THREE.Group();
    scene.add(particlesGroup);
    
    const sphereGeo = new THREE.SphereGeometry(0.3, 6, 6);
    const boxGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const octGeo = new THREE.OctahedronGeometry(0.4, 0);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const mesh = new THREE.Mesh(particleSphereGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
        mesh.userData = { 
            origPos: new THREE.Vector3((Math.random()-0.5)*PARTICLE_BOUNDS, (Math.random()-0.5)*PARTICLE_BOUNDS, (Math.random()-0.5)*PARTICLE_BOUNDS),
            vel: new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2),
            rotVel: new THREE.Euler(Math.random()*2, Math.random()*2, Math.random()*2),
            pulse: Math.random() * Math.PI * 2
        };
        mesh.position.copy(mesh.userData.origPos);
        particlePool.push(mesh);
        particlesGroup.add(mesh);
    }
}

function refreshParticleSystem(zoneIdx) {
    const zoneData = ZONES[zoneIdx];
    const floorY = zoneData.minY;
    const floorH = zoneData.maxY - zoneData.minY;

    particlePool.forEach((p, i) => {
        let mat = p.material;
        mat.opacity = 0.8; mat.emissiveIntensity = 0; mat.vertexColors = false; 

        // STATIONARY SCATTERING: Position within the specific floor bounds
        p.position.set(
            (Math.random() - 0.5) * 50,
            floorY + Math.random() * floorH,
            (Math.random() - 0.5) * 50
        );
        p.scale.setScalar(0.6 + Math.random() * 0.8);

        switch(zoneIdx) {
            case 0: // Pollen
                p.geometry = particleSphereGeo; mat.color.set(0xffeb3b); break;
            case 1: // Snow
                p.geometry = i % 2 === 0 ? particleBoxGeo : particleHexGeo; mat.color.set(0xffffff); break;
            case 2: // Embers
                p.geometry = particleBoxGeo; mat.color.set(0xff5722); mat.emissive = new THREE.Color(0xff9800); break;
            case 3: // Sky
                p.geometry = particleSphereGeo; mat.color.set(0xffffff); mat.opacity = 0.4; break;
            case 4: // Neon
                p.geometry = particleSphereGeo; mat.color.setHSL(Math.random(), 0.8, 0.6); break;
            case 5: // Crystal (Gems) — hide every other particle to halve the count
                p.geometry = particleOctGeo; mat.color.setHSL(Math.random(), 0.7, 0.5);
                p.visible = (i % 2 === 0); break;
            case 6: // Void
                p.geometry = particleSphereGeo; mat.color.set(0xffffff); p.scale.setScalar(0.2); break;
            case 7: // Steam (District)
                p.geometry = particleSoftSphere; mat.color.set(0xcccccc); mat.opacity = 0.2; break;
            case 8: // Cosmic
                p.geometry = particleSoftSphere; mat.color.setHSL(0.7 + Math.random()*0.2, 0.8, 0.4); mat.opacity = 0.3; break;
            case 9: // Temple (Dust storms)
                p.geometry = particleBoxGeo; mat.color.set(0xbc9c78); mat.opacity = 0.75;
                p.scale.setScalar(0.9 + Math.random() * 0.6); break;
            default:
                p.geometry = particleSphereGeo; mat.color.set(0xffffff);
        }
    });
}

function updateParticleSystem(dt, playerPos) {
    if (GAME_MODE === '2D_RACE') {
        particlesGroup.visible = false;
        return;
    }
    particlesGroup.visible = true;

    const zone = getZoneAtY(playerPos.y);
    const zoneIdx = ZONES.indexOf(zone);

    if (zoneIdx !== lastParticleZone) {
        refreshParticleSystem(zoneIdx);
        lastParticleZone = zoneIdx;
    }

    const zoneData = ZONES[zoneIdx];
    const floorY = zoneData.minY;
    const floorMaxY = zoneData.maxY;

    particlePool.forEach((p, i) => {
        // Stationary drift but restricted to zone
        p.position.add(p.userData.vel.clone().multiplyScalar(dt));
        if (p.position.y > floorMaxY) p.position.y = floorY;
        if (p.position.y < floorY) p.position.y = floorMaxY;

        // Visual behaviors
        if (zoneIdx === 1) p.position.y -= 4.0 * dt; // Snow
        if (zoneIdx === 8) { // Steam (Steampunk District)
            p.position.y += 3.5 * dt;
            p.rotation.z += dt;
        }
        
        // Rotating gears logic if needed but keep it simple for particles
        if (p.mesh && zoneIdx === 8) p.mesh.rotation.x += dt * 5;

        // Pulse logic for neon; gems skip pulse on hidden particles to save CPU
        if (zoneIdx === 4) {
            p.userData.pulse += dt * 3;
            p.scale.setScalar(0.7 + Math.sin(p.userData.pulse) * 0.4);
        } else if (zoneIdx === 5 && p.visible) {
            p.userData.pulse += dt * 3;
            p.scale.setScalar(0.7 + Math.sin(p.userData.pulse) * 0.4);
        }
    });
}

function buildBackgrounds() {
    backgroundGroup = new THREE.Group();
    scene.add(backgroundGroup);

    ZONES.forEach((zone, index) => {
        const count = 35; // objects per zone
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 45 + Math.random() * 25; // 45 to 70 distance
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            let yMax = zone.maxY;
            if (yMax > 400) yMax = zone.minY + 60; // constrain top zone height
            const y = zone.minY + Math.random() * (yMax - zone.minY);

            let geo, mat;
            if (index === 0) { // Grassy Hills
                geo = new THREE.SphereGeometry(Math.random()*2+2, 7, 7);
                mat = new THREE.MeshToonMaterial({ color: 0x81c784 });
            } else if (index === 1) { // Ice Peaks
                geo = new THREE.ConeGeometry(Math.random()*2+1, Math.random()*5+4, 4);
                mat = new THREE.MeshToonMaterial({ color: 0xe1f5fe });
            } else if (index === 2) { // Lava Ruins
                geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                mat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
            } else if (index === 3) { // Sky
                geo = new THREE.TorusGeometry(1.5, 0.4, 4, 12);
                mat = new THREE.MeshToonMaterial({ color: 0xfff59d });
            } else if (index === 4) { // Neon
                geo = new THREE.CylinderGeometry(0.2, 0.2, Math.random()*10+5, 4);
                mat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x80deea : 0xf48fb1 });
            } else if (index === 5) { // Crystal
                geo = new THREE.OctahedronGeometry(Math.random()*1.5+1);
                mat = new THREE.MeshToonMaterial({ color: 0xb2ebf2 });
            } else if (index === 6) { // Void
                geo = new THREE.SphereGeometry(0.4, 4, 4);
                mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            } else if (index === 7) { // Cyberpunk
                geo = new THREE.BoxGeometry(2, Math.random()*6+2, 2);
                mat = new THREE.MeshBasicMaterial({ color: 0x9c27b0, wireframe: true });
            } else if (index === 8) { // Cosmic
                geo = new THREE.TetrahedronGeometry(Math.random()*2+1);
                mat = new THREE.MeshToonMaterial({ color: 0x5c6bc0 });
            } else { // Temple
                geo = new THREE.BoxGeometry(Math.random()*2+1, Math.random()*8+4, Math.random()*2+1);
                mat = new THREE.MeshToonMaterial({ color: 0x8d6e63 });
            }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
            
            // Save original values for proximity squishing/pushing
            mesh.userData.origPos = mesh.position.clone();
            mesh.userData.origScale = mesh.scale.clone();
            
            backgroundGroup.add(mesh);
        }
    });
}

let groundMesh = null;
function buildGround() {
    if (groundMesh) { scene.remove(groundMesh); groundMesh = null; }

    // Generate a dirt texture via canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dirt colour
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(0, 0, 512, 512);

    // Dark patches
    for (let i = 0; i < 120; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 22 + 6;
        ctx.fillStyle = `rgba(50,28,10,${0.18 + Math.random() * 0.22})`;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + Math.random() * 0.8), Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    // Light pebbles / highlights
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = `rgba(180,130,80,${0.12 + Math.random() * 0.18})`;
        ctx.beginPath(); ctx.arc(x, y, Math.random() * 8 + 2, 0, Math.PI * 2); ctx.fill();
    }
    // Horizontal scratch lines for texture
    ctx.strokeStyle = 'rgba(40,20,5,0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        const sy = Math.random() * 512;
        ctx.moveTo(0, sy);
        ctx.bezierCurveTo(128, sy + (Math.random()-0.5)*20, 384, sy + (Math.random()-0.5)*20, 512, sy + (Math.random()-0.5)*10);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 20);

    const geo = new THREE.PlaneGeometry(400, 400);
    const mat = new THREE.MeshToonMaterial({ map: tex });
    groundMesh = new THREE.Mesh(geo, mat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -0.51, 0);
    groundMesh.receiveShadow = true;
    // Give it zone 0 so it is never zone-culled
    groundMesh.userData.zoneIndex = 0;
    scene.add(groundMesh);
}

function loadTower(index = 0) { 
    currentTowerIndex = index; 
    const currentTower = TOWERS[currentTowerIndex];
    clearTower();

    // Set initial sky
    const startZone = ZONES[0];
    currentSkyColor.set(startZone.skyColor);
    scene.background = currentSkyColor.clone();
    scene.fog = new THREE.FogExp2(currentSkyColor.clone(), startZone.fogDensity);

    for (const [x, y, z, w, h, d, c] of currentTower.platforms) buildPlatform(x, y, z, w, h, d, c);
    for (const def of (currentTower.movingPlatforms || [])) buildMovingPlatform(def);
    buildGoalStar(currentTower.goalPos);
    buildGround();
    // Removed buildBackgrounds for performance and Fog/Sky transition effect

    // Reset players
    p1Obj.mesh.position.copy(currentTower.spawn);
    p1Obj.mesh.visible = true;
    p1State.velocity.set(0, 0, 0); p1State.jumpsRemaining = 2; p1State.isGrounded = false;
    p1State.coyoteTimer = 0; p1State.jumpBufferTimer = 0; p1State.isGrabbing = false; p1State.isPullingUp = false;
    
    if (GAME_MODE === '2D_RACE') {
        p2Obj.mesh.position.copy(currentTower.spawn);
        p2Obj.mesh.position.x -= 2; // offset start lightly
        
        scene.add(p2Obj.mesh);
        scene.add(p2Obj.lHand);
        scene.add(p2Obj.rHand);
        p2Obj.mesh.visible = true;
        p2Obj.lHand.visible = false; p2Obj.rHand.visible = false;
        
        p2State.velocity.set(0, 0, 0); p2State.jumpsRemaining = 2; p2State.isGrounded = false;
        p2State.coyoteTimer = 0; p2State.jumpBufferTimer = 0; p2State.isGrabbing = false; p2State.isPullingUp = false;
        orbit.radius = 22; // ensure zoomed out
        if (hudLevel) hudLevel.style.display = 'none';
    } else {
        scene.remove(p2Obj.mesh);
        scene.remove(p2Obj.lHand);
        scene.remove(p2Obj.rHand);
        p2Obj.mesh.visible = false;
        p2Obj.lHand.visible = false;
        p2Obj.rHand.visible = false;
        if (hudLevel) hudLevel.style.display = 'block';
    }

    updateHUD();
}

// ─────────────────────────────────────────────────────────
//  HUD & OVERLAY
// ─────────────────────────────────────────────────────────
const hudLevel = document.getElementById('hud-level');
const hudInstructions = document.getElementById('instructions');
let lastHudZone = null;

function updateHUD() {
    if (GAME_MODE === '2D_RACE') {
        if (hudLevel) hudLevel.style.display = 'none';
        return;
    }
    if (hudLevel && p1Obj.mesh) {
        hudLevel.style.display = 'block';
        const zone = getZoneAtY(p1Obj.mesh.position.y);
        if (zone !== lastHudZone) {
            const floorNum = ZONES.indexOf(zone) + 1;
            hudLevel.textContent = `Floor ${floorNum}: ${zone.name}`;
            lastHudZone = zone;
        }
    }
}

const overlay = document.getElementById('level-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayBtn3d = document.getElementById('overlay-btn-3d');
const overlayBtn2d = document.getElementById('overlay-btn-2d');
let levelTransitioning = false;

function showLevelOverlay(title) {
    overlay.style.display = 'flex';
    overlayTitle.textContent = title;
    levelTransitioning = true;
    
    // 3D Solo Button
    overlayBtn3d.onclick = () => {
        GAME_MODE = '3D_SOLO';
        overlay.style.display = 'none';
        levelTransitioning = false;
        loadTower(0); 
        if (hudInstructions) hudInstructions.style.display = 'none';
    };
    
    // 2D Race Button
    if (overlayBtn2d) {
        overlayBtn2d.onclick = () => {
            GAME_MODE = '2D_RACE';
            overlay.style.display = 'none';
            levelTransitioning = false;
            loadTower(TOWERS.length - 1); // latest tower is the 2D race map
            if (hudInstructions) hudInstructions.style.display = 'none';
        };
    }
}

// ─────────────────────────────────────────────────────────
//  INPUT
// ─────────────────────────────────────────────────────────
const keys1 = { w: false, a: false, s: false, d: false, c: false, ' ': false, shift: false };
const keys2 = { arrowup: false, arrowleft: false, arrowdown: false, arrowright: false };

window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    
    if (k === '\\') {
        p1State.isCreative = !p1State.isCreative;
        if (p1State.isCreative) p1State.velocity.set(0, 0, 0);
    }
    
    if (k in keys1) keys1[k] = true;
    if (k in keys2) keys2[k] = true;

    // P1 jump buffer (Space always, W only if in 2D Race)
    const isP1Jump = k === ' ' || (GAME_MODE === '2D_RACE' && k === 'w');
    if (isP1Jump && !levelTransitioning) {
        p1State.jumpBufferTimer = JUMP_BUFFER; 
        if (canJump(p1State)) performJump(p1State);  
    }
    // P2 jump buffer (ArrowUp)
    if (k === 'arrowup' && !levelTransitioning) {
        p2State.jumpBufferTimer = JUMP_BUFFER;
        if (canJump(p2State)) performJump(p2State);
    }
    
    if ([' ', 'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});

window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k in keys1) keys1[k] = false;
    if (k in keys2) keys2[k] = false;
});

// ─────────────────────────────────────────────────────────
//  PHYSICS
// ─────────────────────────────────────────────────────────
const SPEED = 11;
const ACCEL = 55;
const FRICTION = 12;
const JUMP_FORCE = 13;
const GRAVITY = -32;
const COYOTE_TIME = 0.12; 
const JUMP_BUFFER = 0.15; 
const PULL_UP_DURATION = 0.45;

const groundRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
const pAABB = new THREE.Box3();
const oAABB = new THREE.Box3();


function canJump(state) { return state.jumpsRemaining > 0 || state.coyoteTimer > 0; }

function performJump(state) {
    state.velocity.y = JUMP_FORCE;
    if (state.jumpsRemaining > 0) state.jumpsRemaining--;
    state.coyoteTimer = 0; 
    state.jumpBufferTimer = 0; 
    state.isGrounded = false;
    state.mesh.scale.set(0.75, 1.25, 0.75); 
}

function checkGround(state) {
    groundRay.set(state.mesh.position, new THREE.Vector3(0, -1, 0));
    const hits = groundRay.intersectObjects(levelObjects);
    state.isGrounded = false;
    if (hits.length > 0 && hits[0].distance <= 1.02 && state.velocity.y <= 0) {
        state.mesh.position.y = hits[0].point.y + 1.0;
        state.velocity.y = 0;
        state.isGrounded = true;
        state.jumpsRemaining = 2;

        // Track the platform we're standing on so visibility logic keeps it shown
        const hitRoot = hits[0].object.parent && hits[0].object.parent.isMesh
            ? hits[0].object.parent
            : hits[0].object;
        state.lastPlatform = hitRoot;

        for (const mp of movingPlatformObjects) {
            if (mp.mesh === hitRoot || hitRoot === mp.mesh) {
                state.mesh.position.add(mp.delta);
                break;
            }
        }
    }
}

function updateMovingPlatforms(dt) {
    for (const mp of movingPlatformObjects) {
        const totalDist = mp.start.distanceTo(mp.end);
        if (totalDist === 0) continue;
        const prevPos = mp.mesh.position.clone();
        mp.t += mp.dir * (mp.speed / totalDist) * dt;
        if (mp.t >= 1) { mp.t = 1; mp.dir = -1; }
        if (mp.t <= 0) { mp.t = 0; mp.dir = 1; }
        mp.mesh.position.lerpVectors(mp.start, mp.end, mp.t);
        mp.delta.copy(mp.mesh.position).sub(prevPos);
    }
}

function resolveWalls(state) {
    pAABB.setFromObject(state.mesh);
    pAABB.min.y += 0.3;
    pAABB.max.y -= 0.25;

    for (const obj of levelObjects) {
        // Use geometry bounding box to ensure decorations don't affect hitboxes
        if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
        oAABB.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
        
        if (!pAABB.intersectsBox(oAABB)) continue;

        const dx1 = oAABB.max.x - pAABB.min.x;
        const dx2 = pAABB.max.x - oAABB.min.x;
        const dz1 = oAABB.max.z - pAABB.min.z;
        const dz2 = pAABB.max.z - oAABB.min.z;
        const pushX = dx1 < dx2 ? dx1 : -dx2;
        const pushZ = dz1 < dz2 ? dz1 : -dz2;

        if (Math.abs(pushX) < Math.abs(pushZ)) {
            state.mesh.position.x += pushX;
            state.velocity.x = 0;
        } else {
            state.mesh.position.z += pushZ;
            state.velocity.z = 0;
        }
        pAABB.setFromObject(state.mesh);
    }
}

const tmpVec = new THREE.Vector3();
const camRight = new THREE.Vector3();
const moveDir = new THREE.Vector3();

// Ledge Grab logic
function checkLedgeGrab(state, controlKeys, upKey, downKey) {
    if (state.isGrounded || state.isGrabbing || state.grabCooldown > 0 || state.velocity.y > 5) return false;

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(state.mesh.quaternion);
    const chestPt = state.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0));
    const chestRay = new THREE.Raycaster(chestPt, forward, 0, 0.9);
    const wallHits = chestRay.intersectObjects(levelObjects);

    if (wallHits.length > 0) {
        state.lastPlatform = wallHits[0].object; // Touching logic
        const eyeRay = new THREE.Raycaster(state.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), forward, 0, 0.9);
        const hipRay = new THREE.Raycaster(state.mesh.position.clone().add(new THREE.Vector3(0, 0.1, 0)), forward, 0, 0.9);
        
        const eyeHits = eyeRay.intersectObjects(levelObjects);
        const hipHits = hipRay.intersectObjects(levelObjects);

        if (eyeHits.length === 0 || hipHits.length > 0) {
            state.isGrabbing = true;
            state.velocity.set(0, 0, 0);
            state.ledgeNormal.copy(wallHits[0].face.normal).applyQuaternion(wallHits[0].object.quaternion);
            
            const snapPos = wallHits[0].point.clone().sub(forward.multiplyScalar(0.45));
            state.mesh.position.x = snapPos.x;
            state.mesh.position.z = snapPos.z;

            const tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), state.ledgeNormal).normalize();
            state.lHand.position.copy(wallHits[0].point).addScaledVector(tangent, 0.35).setY(state.mesh.position.y + 0.9);
            state.rHand.position.copy(wallHits[0].point).addScaledVector(tangent, -0.35).setY(state.mesh.position.y + 0.9);
            state.lHand.visible = true;
            state.rHand.visible = true;
            
            state.ledgeHangTime = 0;
            state.mesh.rotation.y = Math.atan2(-state.ledgeNormal.x, -state.ledgeNormal.z);
            return true;
        }
    }
    return false;
}

function updatePhysicsState(state, dt, controlKeys, upKey, downKey, leftKey, rightKey, activeCamera) {
    if (levelTransitioning) return;
    
    // Allow physics even if mesh is invisible (FP mode) or specifically for p1 in 3D mode
    const isLocalFP = (state === p1State && orbit.isFirstPerson && GAME_MODE === '3D_SOLO');
    if (!state.mesh.visible && !isLocalFP) return; 

    // Creative Flight Mode
    if (state.isCreative) {
        state.velocity.set(0, 0, 0);
        state.isGrounded = false;
        state.isGrabbing = false;
        state.isPullingUp = false;

        const fwd = GAME_MODE === '2D_RACE' ? 0 : (controlKeys[upKey] ? 1 : 0) - (controlKeys[downKey] ? 1 : 0);
        const rt = (controlKeys[rightKey] ? 1 : 0) - (controlKeys[leftKey] ? 1 : 0);

        activeCamera.getWorldDirection(tmpVec);
        tmpVec.y = 0; tmpVec.normalize();
        if (tmpVec.lengthSq() === 0) tmpVec.set(0, 0, 1);
        camRight.crossVectors(activeCamera.up, tmpVec).normalize();

        moveDir.set(0, 0, 0);
        moveDir.addScaledVector(tmpVec, fwd);
        moveDir.addScaledVector(camRight, -rt);
        if (moveDir.lengthSq() > 1) moveDir.normalize();

        const flySpeed = SPEED * 2.5;
        state.mesh.position.x += moveDir.x * flySpeed * dt;
        state.mesh.position.z += moveDir.z * flySpeed * dt;

        if (controlKeys[' ']) state.mesh.position.y += flySpeed * dt;
        if (controlKeys['shift']) state.mesh.position.y -= flySpeed * dt;

        if (GAME_MODE === '2D_RACE') {
            state.mesh.position.z = 0;
            state.mesh.rotation.y = Math.PI / 2;
        } else if (orbit.isFirstPerson) {
            state.mesh.rotation.y = orbit.theta;
        } else {
            if (moveDir.lengthSq() > 0) {
                const targetAngle = Math.atan2(moveDir.x, moveDir.z);
                let cur = state.mesh.rotation.y;
                while (cur - targetAngle > Math.PI) cur -= Math.PI * 2;
                while (cur - targetAngle < -Math.PI) cur += Math.PI * 2;
                state.mesh.rotation.y = THREE.MathUtils.lerp(cur, targetAngle, 15 * dt);
            }
        }

        resolveWalls(state);
        
        if (goalMesh) {
            const dist = state.mesh.position.distanceTo(goalMesh.position);
            if (dist < 2.2) triggerWin(state === p1State ? 'Player 1' : 'Player 2');
        }
        return;
    }

    const wasGrounded = state.isGrounded;

    const fwd = GAME_MODE === '2D_RACE' ? 0 : (controlKeys[upKey] ? 1 : 0) - (controlKeys[downKey] ? 1 : 0);
    const rt = (controlKeys[rightKey] ? 1 : 0) - (controlKeys[leftKey] ? 1 : 0);

    activeCamera.getWorldDirection(tmpVec);
    tmpVec.y = 0; tmpVec.normalize();
    camRight.crossVectors(activeCamera.up, tmpVec).normalize();

    moveDir.set(0, 0, 0);
    moveDir.addScaledVector(tmpVec, fwd);
    moveDir.addScaledVector(camRight, -rt);
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    if (moveDir.lengthSq() > 0) {
        state.velocity.x += moveDir.x * ACCEL * dt;
        state.velocity.z += moveDir.z * ACCEL * dt;

        if (!state.isGrabbing) {
            if (orbit.isFirstPerson && GAME_MODE !== '2D_RACE') {
                state.mesh.rotation.y = orbit.theta;
            } else {
                const targetAngle = Math.atan2(state.velocity.x, state.velocity.z);
                let cur = state.mesh.rotation.y;
                while (cur - targetAngle > Math.PI) cur -= Math.PI * 2;
                while (cur - targetAngle < -Math.PI) cur += Math.PI * 2;
                state.mesh.rotation.y = THREE.MathUtils.lerp(cur, targetAngle, 15 * dt);
            }
        }
    } else if (orbit.isFirstPerson && !state.isGrabbing && GAME_MODE !== '2D_RACE') {
        state.mesh.rotation.y = orbit.theta;
    }

    const friction = state.isGrounded ? FRICTION : FRICTION * 0.15;
    state.velocity.x = THREE.MathUtils.lerp(state.velocity.x, 0, friction * dt);
    state.velocity.z = THREE.MathUtils.lerp(state.velocity.z, 0, friction * dt);

    const hLen = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
    if (hLen > SPEED) {
        state.velocity.x = (state.velocity.x / hLen) * SPEED;
        state.velocity.z = (state.velocity.z / hLen) * SPEED;
    }

    if (!state.isGrounded) state.velocity.y += GRAVITY * dt;
    if (state.velocity.y < -28) state.velocity.y = -28;

    state.mesh.position.x += state.velocity.x * dt;
    state.mesh.position.z += state.velocity.z * dt;
    state.mesh.position.y += state.velocity.y * dt;

    // Lock Z entirely in 2D mode
    if (GAME_MODE === '2D_RACE') {
        state.mesh.position.z = 0;
        state.velocity.z = 0;
    }

    state.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 12 * dt);

    checkGround(state);
    resolveWalls(state);

    if (state.grabCooldown > 0) state.grabCooldown -= dt;

    if (state.isPullingUp) {
        state.pullUpTime += dt;
        let t = state.pullUpTime / PULL_UP_DURATION;
        if (t >= 1) t = 1;

        const yT = Math.min(t * 1.5, 1.0);
        const xzT = t > 0.3 ? (t - 0.3) / 0.7 : 0;
        const smoothYT = yT < 0.5 ? 2 * yT * yT : -1 + (4 - 2 * yT) * yT;
        const smoothXZT = xzT < 0.5 ? 2 * xzT * xzT : -1 + (4 - 2 * xzT) * xzT;

        state.mesh.position.y = THREE.MathUtils.lerp(state.pullUpStartPos.y, state.pullUpEndPos.y, smoothYT);
        state.mesh.position.x = THREE.MathUtils.lerp(state.pullUpStartPos.x, state.pullUpEndPos.x, smoothXZT);
        state.mesh.position.z = THREE.MathUtils.lerp(state.pullUpStartPos.z, state.pullUpEndPos.z, smoothXZT);

        if (t > 0.4) {
            state.lHand.visible = false;
            state.rHand.visible = false;
            state.mesh.rotation.x = THREE.MathUtils.lerp(state.mesh.rotation.x, 0, 10 * dt);
        }

        if (t >= 1.0) {
            state.isPullingUp = false;
            state.isGrabbing = false;
            state.mesh.rotation.x = 0;
            state.grabCooldown = 0.2;
            state.velocity.set(0, -1, 0); 
        }
        return;
    }

    if (state.isGrabbing) {
        state.velocity.set(0,0,0);
        state.jumpsRemaining = 2; 
        state.ledgeHangTime += dt;
        
        const swingPitch = Math.sin(state.ledgeHangTime * 2.5) * 0.12;
        state.mesh.rotation.set(swingPitch, Math.atan2(-state.ledgeNormal.x, -state.ledgeNormal.z), 0, 'YXZ');
        
        if (controlKeys[' '] || controlKeys[upKey]) {
            state.isPullingUp = true;
            state.pullUpTime = 0;
            state.pullUpStartPos.copy(state.mesh.position);
            state.pullUpEndPos.copy(state.mesh.position).addScaledVector(state.ledgeNormal, -0.9).add(new THREE.Vector3(0, 1.05, 0));
        }
        else if (controlKeys[downKey]) {
            state.isGrabbing = false;
            state.grabCooldown = 0.4;
            state.lHand.visible = false;
            state.rHand.visible = false;
            state.mesh.rotation.x = 0;
        }
        return;
    } else {
        checkLedgeGrab(state, controlKeys, upKey, downKey);
    }

    if (wasGrounded && !state.isGrounded && state.velocity.y <= 0) state.coyoteTimer = COYOTE_TIME;
    else if (!state.isGrounded) state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
    else state.coyoteTimer = 0;

    if (!wasGrounded && state.isGrounded) {
        // Squish effect on landing! 
        // Note: performJump will override this with a stretch if jumpBuffer is active
        state.mesh.scale.set(1.35, 0.65, 1.35); 
    }

    if (!wasGrounded && state.isGrounded && state.jumpBufferTimer > 0) performJump(state);
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);

    if (state.mesh.position.y < -15) {
        state.mesh.position.copy(TOWERS[currentTowerIndex].spawn);
        state.velocity.set(0, 0, 0);
        state.coyoteTimer = 0; state.jumpBufferTimer = 0;
        state.isGrabbing = false; state.isPullingUp = false;
        state.lHand.visible = false; state.rHand.visible = false;
        state.mesh.rotation.x = 0;
    }

    if (goalMesh) {
        const dist = state.mesh.position.distanceTo(goalMesh.position);
        if (dist < 2.2) triggerWin(state === p1State ? 'Player 1' : 'Player 2');
    }
}

// ─────────────────────────────────────────────────────────
//  GOAL LOGIC
// ─────────────────────────────────────────────────────────
function triggerWin(winnerName) {
    if (GAME_MODE === '2D_RACE') {
        showLevelOverlay(`🏆 ${winnerName} Wins! Play Again?`);
    } else {
        showLevelOverlay('🏆 You Reached the Top!');
    }
    orbit.theta = 0; orbit.phi = 0.3; orbit.radius = 12;
}

// ─────────────────────────────────────────────────────────
//  ANIMATION LOOP
// ─────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    updateMovingPlatforms(dt);
    updateParticleSystem(dt, p1State.mesh.position);

    // Extra behavior: Rotate Steampunk Gears
    if (levelObjects.length > 0) {
        const zone = getZoneAtY(p1State.mesh.position.y);
        if (ZONES.indexOf(zone) === 8) {
            levelObjects.forEach(obj => {
                obj.children.forEach(child => {
                    if (child.userData && child.userData.rotSpeed) {
                        child.rotation.y += child.userData.rotSpeed * dt;
                    }
                });
            });
        }
    }
    
    // P1: w/s up/down, a/d left/right
    updatePhysicsState(p1State, dt, keys1, 'w', 's', 'a', 'd', camera1);
    
    if (GAME_MODE === '2D_RACE') {
        // P2: arrow keys
        updatePhysicsState(p2State, dt, keys2, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', camera2);
    }

    // Background Object Squishing and Pushing!
    if (backgroundGroup) {
        for (const bg of backgroundGroup.children) {
            let totalRepel = new THREE.Vector3();
            let closestDist = Infinity;
            
            const players = [p1Obj.mesh];
            if (p2Obj.mesh.visible) players.push(p2Obj.mesh);

            for (const p of players) {
                const distSq = p.position.distanceToSquared(bg.userData.origPos);
                if (distSq < closestDist) closestDist = distSq;
                if (distSq < 144) { // radius 12 units
                    const dist = Math.sqrt(distSq);
                    const pushDir = bg.userData.origPos.clone().sub(p.position);
                    pushDir.y *= 0.2; // mostly push horizontally
                    if (pushDir.lengthSq() > 0) pushDir.normalize();
                    const strength = (12 - dist) * 0.45;
                    totalRepel.add(pushDir.multiplyScalar(strength));
                }
            }

            bg.position.lerp(bg.userData.origPos.clone().add(totalRepel), 0.15);
            
            if (closestDist < 144) {
                const dist = Math.sqrt(closestDist);
                const intensity = (12 - dist) / 12;
                const widen = 1 + intensity * 0.8;
                const squish = 1 - intensity * 0.4;
                bg.scale.lerp(new THREE.Vector3(
                    bg.userData.origScale.x * widen,
                    bg.userData.origScale.y * squish,
                    bg.userData.origScale.z * widen
                ), 0.2);
            } else {
                bg.scale.lerp(bg.userData.origScale, 0.08);
            }
        }
    }

    if (goalMesh) {
        goalMesh.rotation.y += dt * 1.5;
        goalMesh.rotation.x += dt * 0.7;
        
        // --- BULLETPROOF GOAL VISIBILITY ---
        if (GAME_MODE === '3D_SOLO') {
            // Force it to the top of the tower for the solo climb
            goalMesh.position.set(8, 335 + 2.2 + Math.sin(clock.elapsedTime * 2) * 0.3, 8);
            goalMesh.visible = true;
            goalMesh.frustumCulled = false;
        } else {
            // Use the tower defined goal position for other modes
            goalMesh.position.y = TOWERS[currentTowerIndex].goalPos.y + 2.2 + Math.sin(clock.elapsedTime * 2) * 0.3;
            goalMesh.visible = true;
        }

        for (const p of goalParticles) {
            p.userData.angle += p.userData.speed * dt;
            p.position.x = Math.cos(p.userData.angle) * p.userData.radius;
            p.position.z = Math.sin(p.userData.angle) * p.userData.radius;
            p.position.y = Math.sin(p.userData.angle * 2) * 0.3 + p.userData.yOff;
        }
    }

    // --- BULLETPROOF PLAYER 2 HIDING ---
    if (GAME_MODE === '3D_SOLO' && p2Obj) {
        p2Obj.mesh.visible = false;
        p2Obj.lHand.visible = false;
        p2Obj.rHand.visible = false;
    }

    if (GAME_MODE === '2D_RACE') {
        const w = innerWidth;
        const h = innerHeight;
        renderer.setScissorTest(true);
        
        // P1 view (Left half)
        updateOrbitCamera(camera1, p1Obj.mesh, false);
        renderer.setViewport(0, 0, w/2, h);
        renderer.setScissor(0, 0, w/2, h);
        renderer.render(scene, camera1);
        
        // P2 view (Right half)
        updateOrbitCamera(camera2, p2Obj.mesh, true);
        renderer.setViewport(w/2, 0, w/2, h);
        renderer.setScissor(w/2, 0, w/2, h);
        renderer.render(scene, camera2);
        
        renderer.setScissorTest(false);
    } else {
        // 3D Solo normal view
        updateOrbitCamera(camera1, p1Obj.mesh, false);
        updateVisibility(camera1, p1State); 
        
        // Fog & Sky transition LERPing
        const playerPos = p1Obj.mesh.position;
        const currentZone = getZoneAtY(playerPos.y);
        const targetColor = new THREE.Color(currentZone.skyColor);
        scene.background.lerp(targetColor, 0.05);
        scene.fog.color.lerp(targetColor, 0.05);
        scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, currentZone.fogDensity, 0.05);

        renderer.setViewport(0, 0, innerWidth, innerHeight);
        renderer.render(scene, camera1);
    }

    // Live HUD updates
    updateHUD();
}

// ─────────────────────────────────────────────────────────
//  RESIZE
// ─────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera1.aspect = innerWidth / innerHeight;
    camera1.updateProjectionMatrix();
    if (GAME_MODE === '2D_RACE') {
        const halfAspect = (innerWidth/2) / innerHeight;
        camera1.aspect = halfAspect;
        camera1.updateProjectionMatrix();
        camera2.aspect = halfAspect;
        camera2.updateProjectionMatrix();
    }
    renderer.setSize(innerWidth, innerHeight);
});

const projMat = new THREE.Matrix4();
const frustum = new THREE.Frustum();
function updateVisibility(activeCamera, state) {
    if (GAME_MODE === '2D_RACE') return;

    projMat.multiplyMatrices(activeCamera.projectionMatrix, activeCamera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projMat);

    // Gaze Logic: Look straight up or down to reveal tower
    const lookDir = new THREE.Vector3();
    activeCamera.getWorldDirection(lookDir);
    if (Math.abs(lookDir.y) > 0.82) {
        state.lookTimer += 0.016; // Approx dt
        if (state.lookTimer > 1.5) {
            state.dynamicRadius = Math.min(10, state.dynamicRadius + 0.1);
        }
    } else {
        state.lookTimer = 0;
        state.dynamicRadius = Math.max(2, state.dynamicRadius - 0.2);
    }

    const playerZone = getZoneAtY(state.mesh.position.y);
    const playerZoneIdx = ZONES.indexOf(playerZone);

    const allObjs = [...levelObjects, ...movingPlatformObjects.map(o => o.mesh)];
    for (const obj of allObjs) {
        const dist = activeCamera.position.distanceTo(obj.position);
        const objZoneIdx = obj.userData.zoneIndex !== undefined ? obj.userData.zoneIndex : playerZoneIdx;
        
        const inFloorRadius = Math.abs(objZoneIdx - playerZoneIdx) <= state.dynamicRadius;
        // A platform is "touched" if it's the one we're standing on OR grabbing
        const isTouching = state.lastPlatform === obj || state.lastPlatform === obj.parent;

        if (isTouching) {
            // Always show the platform the player is on
            obj.visible = true;
        } else if (dist < 2.8 && !isTouching) {
            // Hide very close objects that block the view, but not the one underfoot
            obj.visible = false;
        } else if (inFloorRadius) {
            obj.visible = frustum.intersectsObject(obj);
        } else {
            obj.visible = false;
        }
    }
}

// ─────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────
showLevelOverlay('Cartoony Platformer');
initParticleSystem();
animate();
