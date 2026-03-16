import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAMERA_HEIGHT } from './utils/constants.js';

// Character model configs — must match server.js whitelist
const CHARACTER_CONFIGS = {
    male_character_7: { path: '/male_character_7/scene.gltf', scale: 1,    yOffset: 0     },
    man_in_suit:      { path: '/man_in_suit/scene.gltf',      scale: 0.01, yOffset: -0.03 },
};

// Height (world units) at which the name label floats above the floor
const LABEL_HEIGHT = 2.3;

// Reactions
const REACTION_HEIGHT   = 3.4;  // world units above group origin (just above label)
const REACTION_DURATION = 2.0;  // seconds
const FLOAT_AMOUNT      = 0.9;  // units to float upward during animation

// Throttle: send at most once per SEND_INTERVAL_MS
const SEND_INTERVAL_MS = 50; // ~20 fps

let _socket = null;
let _scene  = null;
let _camera = null;

// Map<id, { group, model, label, targetX, targetZ, prevX, prevZ, faceRotY }>
const _remotePlayers = new Map();

// Active floating reaction sprites: { sprite, group|null, camera|null, elapsed }
const _reactions = [];

let _lastSendTime = 0;
// NaN ensures the very first call always sends, regardless of spawn position
let _lastX = NaN, _lastY = NaN, _lastZ = NaN;

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Connect to the WebSocket server, announce name + character choice,
 * and start syncing with other players.
 */
export function initMultiplayer(scene, camera, { name, character }) {
    _scene  = scene;
    _camera = camera;

    // Connect directly to the WS server — no Vite proxy needed
    // (WebSocket is not subject to same-origin restrictions)
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080';

    try {
        _socket = new WebSocket(wsUrl);
    } catch (e) {
        console.warn('Multiplayer: could not open WebSocket —', e.message);
        return;
    }

    _socket.addEventListener('open', () => {
        console.log('Multiplayer: connected');
        _socket.send(JSON.stringify({ type: 'join', name, character }));
    });

    _socket.addEventListener('message', (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        _handleMessage(msg);
    });

    _socket.addEventListener('error',  () => console.warn('Multiplayer: WS error'));
    _socket.addEventListener('close',  () => console.log('Multiplayer: disconnected'));
}

/**
 * Call this every animation frame.
 * Lerps remote player positions, rotates models toward movement direction,
 * and throttle-sends the local camera position.
 */
export function updateMultiplayer(camera, delta) {
    const lerp = Math.min(1, delta * 12);

    for (const [, player] of _remotePlayers) {
        const prevX = player.group.position.x;
        const prevZ = player.group.position.z;

        player.group.position.x += (player.targetX - player.group.position.x) * lerp;
        player.group.position.y += (player.targetY - player.group.position.y) * lerp;
        player.group.position.z += (player.targetZ - player.group.position.z) * lerp;

        if (player.model) {
            const dx = player.group.position.x - prevX;
            const dz = player.group.position.z - prevZ;
            const moved = Math.sqrt(dx * dx + dz * dz);

            if (moved > 0.0005) {
                // atan2(dx, dz) gives the angle (from +Z) the model should face
                player.faceRotY = Math.atan2(dx, dz);
            }

            // Smooth rotation — find shortest arc
            let diff = player.faceRotY - player.model.rotation.y;
            while (diff >  Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            player.model.rotation.y += diff * lerp;
        }
    }

    _sendPosition(camera);
}

// ─────────────────────────────────────────────
// Reactions
// ─────────────────────────────────────────────

/** Send a reaction emoji to all other players. */
export function sendReaction(emoji) {
    if (!_socket || _socket.readyState !== WebSocket.OPEN) return;
    _socket.send(JSON.stringify({ type: 'reaction', emoji }));
}

/**
 * Show a reaction emoji floating above the local player (camera).
 * Called immediately when the local player triggers a reaction.
 */
export function showLocalReaction(emoji, camera) {
    _spawnReaction(null, emoji, camera);
}

/**
 * Tick all active reaction animations. Call once per frame.
 */
export function updateReactions(delta) {
    for (let i = _reactions.length - 1; i >= 0; i--) {
        const r = _reactions[i];
        r.elapsed += delta;
        const t = Math.min(r.elapsed / REACTION_DURATION, 1);
        const floatY = t * FLOAT_AMOUNT;

        if (r.camera) {
            // Local player: sprite follows camera world position
            r.sprite.position.set(
                r.camera.position.x,
                r.camera.position.y + 0.6 + floatY,
                r.camera.position.z,
            );
        } else {
            r.sprite.position.y = REACTION_HEIGHT + floatY;
        }

        // Fade out in the second half
        r.sprite.material.opacity = t > 0.5 ? 1 - (t - 0.5) * 2 : 1;

        if (t >= 1) {
            if (r.camera) {
                _scene.remove(r.sprite);
            } else {
                r.group.remove(r.sprite);
            }
            r.sprite.material.map?.dispose();
            r.sprite.material.dispose();
            _reactions.splice(i, 1);
        }
    }
}

// ─────────────────────────────────────────────
// Message handlers
// ─────────────────────────────────────────────

function _handleMessage(msg) {
    switch (msg.type) {
        case 'welcome':
            for (const p of msg.players) _addRemotePlayer(p);
            // Immediately broadcast our own position so others don't see us at 0,0
            if (_camera) _sendPositionNow(_camera);
            break;
        case 'playerJoined':
            _addRemotePlayer(msg);
            break;
        case 'playerMoved':
            _updateRemotePlayer(msg);
            break;
        case 'playerLeft':
            _removeRemotePlayer(msg.id);
            break;
        case 'reaction': {
            const player = _remotePlayers.get(msg.id);
            if (player) _spawnReaction(player.group, msg.emoji, null);
            break;
        }
    }
}

function _addRemotePlayer({ id, name, character, x, y, z }) {
    if (_remotePlayers.has(id)) return;

    // Convert camera-space Y to floor-relative Y (group sits on floor)
    const floorY = (y != null ? y - CAMERA_HEIGHT : 0);

    const group = new THREE.Group();
    group.position.set(x ?? 0, floorY, z ?? 0);
    _scene.add(group);

    // Name label
    const label = _createNameLabel(name);
    label.position.set(0, LABEL_HEIGHT, 0);
    group.add(label);

    const playerData = {
        group,
        model:    null,
        label,
        targetX:  x ?? 0,
        targetY:  floorY,
        targetZ:  z ?? 0,
        faceRotY: 0,
    };
    _remotePlayers.set(id, playerData);

    // Load character model into the group
    const cfg = CHARACTER_CONFIGS[character] ?? CHARACTER_CONFIGS.male_character_7;
    _loadModel(group, cfg, (model) => {
        playerData.model = model;
    });
}

function _updateRemotePlayer({ id, x, y, z }) {
    const player = _remotePlayers.get(id);
    if (!player) return;
    player.targetX = x ?? player.targetX;
    player.targetY = y != null ? y - CAMERA_HEIGHT : player.targetY;
    player.targetZ = z ?? player.targetZ;
}

function _removeRemotePlayer(id) {
    const player = _remotePlayers.get(id);
    if (!player) return;
    _scene.remove(player.group);
    // Dispose label texture
    player.label.material.map?.dispose();
    player.label.material.dispose();
    _remotePlayers.delete(id);
}

// ─────────────────────────────────────────────
// Position broadcasting
// ─────────────────────────────────────────────

function _sendPositionNow(camera) {
    if (!_socket || _socket.readyState !== WebSocket.OPEN) return;
    const { x, y, z } = camera.position;
    _socket.send(JSON.stringify({ type: 'move', x, y, z }));
    _lastSendTime = Date.now();
    _lastX = x;
    _lastY = y;
    _lastZ = z;
}

function _sendPosition(camera) {
    if (!_socket || _socket.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    if (now - _lastSendTime < SEND_INTERVAL_MS) return;

    const { x, y, z } = camera.position;

    // Skip if barely moved (dead zone) — also check Y so jumping in place sends
    if (!isNaN(_lastX) && Math.abs(x - _lastX) < 0.005 && Math.abs(z - _lastZ) < 0.005
        && Math.abs(y - _lastY) < 0.005) return;

    _socket.send(JSON.stringify({ type: 'move', x, y, z }));
    _lastSendTime = now;
    _lastX = x;
    _lastY = y;
    _lastZ = z;
}

// ─────────────────────────────────────────────
// Model loading (with specular-gloss material fix)
// ─────────────────────────────────────────────

function _loadModel(parent, { path, scale, yOffset }, onLoaded) {
    const loader = new GLTFLoader();
    loader.load(
        path,
        (gltf) => {
            const model = gltf.scene;
            model.position.set(0, yOffset, 0);
            model.scale.setScalar(scale);

            // Apply KHR_materials_pbrSpecularGlossiness fix (same as character.js)
            const gltfMaterials = gltf.parser?.json?.materials || [];
            const gltfTextures  = gltf.parser?.json?.textures  || [];
            const gltfImages    = gltf.parser?.json?.images    || [];
            const basePath = path.substring(0, path.lastIndexOf('/') + 1);

            model.traverse((child) => {
                if (!child.isMesh) return;
                child.castShadow = true;

                const mat     = child.material;
                if (!mat) return;
                const gltfMat = gltfMaterials.find((m) => m.name === mat.name);
                if (!gltfMat) return;

                const specGloss = gltfMat.extensions?.KHR_materials_pbrSpecularGlossiness;
                if (specGloss) {
                    const df = specGloss.diffuseFactor || [1, 1, 1, 1];
                    mat.color.setRGB(df[0], df[1], df[2]);
                    mat.metalness = 0;
                    mat.roughness = 1.0 - (specGloss.glossinessFactor || 0);

                    if (!mat.map && specGloss.diffuseTexture !== undefined) {
                        const idx = specGloss.diffuseTexture.index;
                        const src = gltfImages[gltfTextures[idx]?.source];
                        if (src) {
                            const t = new THREE.TextureLoader().load(basePath + src.uri);
                            t.flipY = false;
                            t.colorSpace = THREE.SRGBColorSpace;
                            mat.map = t;
                        }
                    }

                    if (!mat.normalMap && gltfMat.normalTexture !== undefined) {
                        const idx = gltfMat.normalTexture.index;
                        const src = gltfImages[gltfTextures[idx]?.source];
                        if (src) {
                            const t = new THREE.TextureLoader().load(basePath + src.uri);
                            t.flipY = false;
                            mat.normalMap = t;
                        }
                    }

                    mat.needsUpdate = true;
                }
            });

            parent.add(model);
            if (onLoaded) onLoaded(model);
        },
        undefined,
        (err) => console.warn('Remote player model load error:', err)
    );
}

// ─────────────────────────────────────────────
// Name label sprite (canvas texture)
// ─────────────────────────────────────────────

const ADMIN_NAME = 'Ahmed';

function _createNameLabel(name) {
    const isAdmin = name.trim() === ADMIN_NAME;
    const W = isAdmin ? 320 : 256, H = 64;
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (isAdmin) {
        // ── Gold glowing admin card ──
        // Outer glow (shadow trick)
        ctx.shadowColor  = '#FFD700';
        ctx.shadowBlur   = 18;

        // Gold gradient background
        const grad = ctx.createLinearGradient(6, 10, W - 6, H - 10);
        grad.addColorStop(0,   '#7A5500');
        grad.addColorStop(0.3, '#FFD700');
        grad.addColorStop(0.5, '#FFF0A0');
        grad.addColorStop(0.7, '#FFD700');
        grad.addColorStop(1,   '#7A5500');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(6, 10, W - 12, H - 20, 12);
        ctx.fill();

        // Gold border
        ctx.shadowBlur   = 0;
        ctx.strokeStyle  = '#FFD700';
        ctx.lineWidth    = 2;
        ctx.stroke();

        // Crown icon
        ctx.fillStyle = '#4A3000';
        ctx.font      = 'bold 18px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', 14, H / 2);

        // Name text in dark gold
        ctx.fillStyle    = '#2A1800';
        ctx.font         = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name.trim(), W / 2 + 10, H / 2);
    } else {
        // ── Standard dark pill ──
        ctx.fillStyle = 'rgba(10, 10, 20, 0.72)';
        ctx.beginPath();
        ctx.roundRect(6, 10, W - 12, H - 20, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle  = '#ffffff';
        ctx.font       = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name.slice(0, 20), W / 2, H / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);

    // const isAdmin = name.trim() === ADMIN_NAME;
    const material = new THREE.SpriteMaterial({
        map:       texture,
        depthTest: false,
        transparent: true,
        sizeAttenuation: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(isAdmin ? 2.2 : 1.8, 0.45, 1);
    return sprite;
}

// ─────────────────────────────────────────────
// Reaction helpers (private)
// ─────────────────────────────────────────────

/**
 * Spawn a floating emoji sprite.
 * - group + no camera → parented to a remote player group
 * - no group + camera → added to scene, tracks local camera
 */
function _spawnReaction(group, emoji, camera) {
    const W = 128, H = 128;
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.font         = '84px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, W / 2, H / 2 + 4);

    const texture  = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map:         texture,
        depthTest:   false,
        transparent: true,
        opacity:     1,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.75, 0.75, 1);

    if (camera) {
        sprite.position.set(camera.position.x, camera.position.y + 0.6, camera.position.z);
        _scene.add(sprite);
        _reactions.push({ sprite, group: null, camera, elapsed: 0 });
    } else {
        sprite.position.set(0, REACTION_HEIGHT, 0);
        group.add(sprite);
        _reactions.push({ sprite, group, camera: null, elapsed: 0 });
    }
}
