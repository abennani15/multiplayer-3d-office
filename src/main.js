import * as THREE from 'three';
import { EffectComposer, RenderPass, BloomEffect, EffectPass } from 'postprocessing';

import { createControls, updateControls } from './controls.js';
import { createRoom } from './office/room.js';
import { createFurniture } from './office/furniture.js';
import { createDecorations, animateDecorations } from './office/decorations.js';
import { createWelcome, animateWelcome } from './scenes/welcome.js';
import { createWhiteboard, animateWhiteboard } from './scenes/whiteboard.js';
import { loadCharacter } from './character.js';
import { loadDesk } from './desk.js';
import { createFrame } from './frame.js';
import { setupRevealFrame, updateRevealFrame } from './scenes/revealFrame.js';
import { SPAWN_POS, AMBIENT_INTENSITY, DIR_LIGHT_INTENSITY, ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT } from './utils/constants.js';
import { addBoxCollider } from './utils/collision.js';
import { showLobby } from './lobby.js';
import { initMultiplayer, updateMultiplayer } from './multiplayer.js';

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Movement Settings ──
export const MOVE_SPEED = 5.0; // Adjust this value to change player walking speed (default was 8)

// ── Scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 15, 45);

// ── Camera ──
const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z);

// ── Lighting ──
// Ambient — warm base light
const ambient = new THREE.AmbientLight(0xFFF5E6, AMBIENT_INTENSITY);
scene.add(ambient);

// Main directional light (simulates overhead office lights)
const dirLight = new THREE.DirectionalLight(0xFFFFEE, DIR_LIGHT_INTENSITY);
dirLight.position.set(5, ROOM_HEIGHT - 0.5, -10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

// Secondary fill light
const fillLight = new THREE.DirectionalLight(0xE8E0FF, 0.3);
fillLight.position.set(-5, 3, 5);
scene.add(fillLight);

// Accent point lights for warmth
const warmLight1 = new THREE.PointLight(0xFFAA55, 1.5, 15, 1.5);
warmLight1.position.set(-8, 3, -10);
scene.add(warmLight1);

const warmLight2 = new THREE.PointLight(0xFFAA55, 1.5, 15, 1.5);
warmLight2.position.set(8, 3, -25);
scene.add(warmLight2);

// ── Build scene ──
const room = createRoom();
scene.add(room);

const furniture = createFurniture();
scene.add(furniture);

const decorations = createDecorations();
scene.add(decorations);

const welcome = createWelcome();
scene.add(welcome);

const whiteboard = createWhiteboard();
scene.add(whiteboard);

// ── Desk models ──
// Three desks along the left wall
for (let i = 0; i < 3; i++) {
    loadCharacter(scene, '/office_desk/scene.gltf', {
        position: { x: -ROOM_WIDTH / 2 + 2.5, y: 0, z: -4 - i * 8 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        scale: 1,
    })
        .catch((err) => console.warn(`Desk ${i + 1} loading failed:`, err));
}

// // ── Character model ──
// // Position near the first desk (left wall, first desk at z=-4)
// // ROOM_WIDTH/2 = 15, first desk x = -15 + 2.5 = -12.5, offset to stand beside it
// loadCharacter(scene, '/male_character_7/scene.gltf', {
//     position: { x: -ROOM_WIDTH / 2 + 3.7, y: 0, z: -2.5 },
//     rotation: { x: 0, y: Math.PI * 0.75, z: 0 },  // facing into the room
//     scale: 1,
// }).catch((err) => console.warn('Character loading failed:', err));

// // Position near the second desk (left wall, second desk at z=-12)
// loadCharacter(scene, '/man_in_suit/scene.gltf', {
//     position: { x: -ROOM_WIDTH / 2 + 3.8, y: -0.03, z: -11.5 },
//     rotation: { x: 0, y: Math.PI * 0.75, z: 0 },
//     scale: 0.01,
// }).catch((err) => console.warn('Man in suit loading failed:', err));

// // Position near the third desk (left wall, third desk at z=-20)
// loadCharacter(scene, '/a_man_sitting/scene.gltf', {
//     position: { x: -ROOM_WIDTH / 2 + 2.9, y: 0.8, z: -19.7 },
//     rotation: { x: 0, y: Math.PI * 0.55, z: 0 },
//     scale: 0.5,
// }).catch((err) => console.warn('Man in suit loading failed:', err));

// ── Soda vending machine — right of entrance, against right wall ──
loadDesk(scene, '/soda_vending_machine/scene.gltf', {
    position: { x: ROOM_WIDTH / 2 - 4.3, y: 1, z: 4.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
}).then(() => {
    // Collider footprint: roughly 0.9 m wide × 0.8 m deep × 1.8 m tall
    addBoxCollider(
        { x: ROOM_WIDTH / 2 - 1.5, y: 0,   z: 3.0 },
        { x: ROOM_WIDTH / 2 - 0.3, y: 1.8, z: 4.0 },
    );
}).catch((err) => console.warn('Vending machine loading failed:', err));

// ── Modern couch — next to vending machine, near entrance right wall ──
loadDesk(scene, '/modern_couch/scene.gltf', {
    position: { x: ROOM_WIDTH / 2 - 1.8, y: -0.1, z: 2.5 },
    rotation: { x: 0, y: Math.PI, z: 0 },
    scale: 1,
}).then((couch) => {
    // Collider footprint: roughly 2 m wide × 1 m deep × 0.9 m tall
    addBoxCollider(
        { x: ROOM_WIDTH / 2 - 5.5, y: 0,   z: 2.8 },
        { x: ROOM_WIDTH / 2 - 1.5, y: 0.9, z: 4.2 },
    );
}).catch((err) => console.warn('Modern couch loading failed:', err));

// ── Picture frames on right wall (between windows) ──
// Positioned between first and second window with room for a third
createFrame(scene, 'V0.15\n17/11/25', {
    position: { x: ROOM_WIDTH / 2 - 0.3, y: 2.2, z: -5.5 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 },
    width: 1.0,
    height: 0.7,
});

createFrame(scene, 'V0.16\n10/12/25', {
    position: { x: ROOM_WIDTH / 2 - 0.3, y: 2.2, z: -8.0 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 },
    width: 1.0,
    height: 0.7,
});

// Setup third frame with a reveal mechanism at z: -10.5
setupRevealFrame(scene);

createFrame(scene, 'V0.17\n10/02/26', {
    position: { x: ROOM_WIDTH / 2 - 0.3, y: 2.2, z: -10.5 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 },
    width: 1.0,
    height: 0.7,
});

// ── Lobby: name + character selection ──
// This must resolve before pointer-lock is available so we await it here.
// (Top-level await is fine in ES modules with Vite.)
const { name: playerName, character: playerCharacter } = await showLobby();

// ── Admin badge (shown in HUD when local player is Ahmed) ──
if (playerName.trim() === 'Ahmed') {
    const badge = document.createElement('div');
    badge.id = 'admin-badge';
    badge.innerHTML = '&#x1F451; Ahmed';
    Object.assign(badge.style, {
        position:        'fixed',
        top:             '16px',
        right:           '18px',
        zIndex:          '60',
        padding:         '6px 16px',
        borderRadius:    '999px',
        background:      'linear-gradient(135deg, #7A5500 0%, #FFD700 40%, #FFF0A0 60%, #FFD700 80%, #7A5500 100%)',
        boxShadow:       '0 0 14px 4px rgba(255,215,0,0.65), 0 0 3px 1px #FFD700',
        color:           '#2A1800',
        fontWeight:      '800',
        fontSize:        '0.95rem',
        fontFamily:      'system-ui, -apple-system, sans-serif',
        letterSpacing:   '0.04em',
        pointerEvents:   'none',
        userSelect:      'none',
        border:          '1.5px solid #FFD700',
    });
    document.body.appendChild(badge);
}

// ── Controls ──
const controls = createControls(camera, renderer.domElement);
scene.add(controls.getObject());

// ── Multiplayer ──
initMultiplayer(scene, camera, { name: playerName, character: playerCharacter });

// Reveal the pointer-lock overlay now that the lobby is done
document.getElementById('overlay').classList.remove('pre-lobby');

// ── Post-processing (Bloom for glow effects) ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomEffect = new BloomEffect({
    intensity: 1.0,
    luminanceThreshold: 0.6,
    luminanceSmoothing: 0.3,
    mipmapBlur: true,
});
composer.addPass(new EffectPass(camera, bloomEffect));

// ── Resize handler ──
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation loop ──
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update player movement
    updateControls(delta, MOVE_SPEED);

    // Sync multiplayer positions
    updateMultiplayer(camera, delta);

    // Animate scene elements
    animateDecorations(decorations, elapsed);
    animateWelcome(welcome, elapsed);
    animateWhiteboard(whiteboard, elapsed, camera.position);
    updateRevealFrame(camera.position, delta);

    // Render with post-processing
    composer.render();
}

animate();
