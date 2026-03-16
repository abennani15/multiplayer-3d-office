import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { WHITEBOARD_POS, COLORS, CAMERA_HEIGHT } from '../utils/constants.js';
import { addCollider } from '../utils/collision.js';

export function createWhiteboard() {
    const group = new THREE.Group();
    group.name = 'whiteboard';

    // ── Whiteboard frame ──
    const frameW = 4;
    const frameH = 2.8;
    const frameD = 0.1;

    // Dark frame
    const frameMat = new THREE.MeshStandardMaterial({
        color: COLORS.whiteboardFrame,
        roughness: 0.4,
        metalness: 0.3,
    });

    // Top
    group.add(makeBox(frameW + 0.2, 0.1, frameD, frameMat,
        WHITEBOARD_POS.x, WHITEBOARD_POS.y + frameH / 2 + 0.05, WHITEBOARD_POS.z));
    // Bottom
    group.add(makeBox(frameW + 0.2, 0.1, frameD, frameMat,
        WHITEBOARD_POS.x, WHITEBOARD_POS.y - frameH / 2 - 0.05, WHITEBOARD_POS.z));
    // Left
    group.add(makeBox(0.1, frameH + 0.2, frameD, frameMat,
        WHITEBOARD_POS.x - frameW / 2 - 0.05, WHITEBOARD_POS.y, WHITEBOARD_POS.z));
    // Right
    group.add(makeBox(0.1, frameH + 0.2, frameD, frameMat,
        WHITEBOARD_POS.x + frameW / 2 + 0.05, WHITEBOARD_POS.y, WHITEBOARD_POS.z));

    // White surface
    const surfaceMat = new THREE.MeshStandardMaterial({
        color: COLORS.whiteboardBg,
        roughness: 0.3,
        metalness: 0.02,
    });
    const surface = new THREE.Mesh(
        new THREE.BoxGeometry(frameW, frameH, frameD * 0.8),
        surfaceMat
    );
    surface.position.set(WHITEBOARD_POS.x, WHITEBOARD_POS.y, WHITEBOARD_POS.z - 0.01);
    surface.receiveShadow = true;
    group.add(surface);

    // Marker tray at bottom
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.4 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(frameW + 0.2, 0.05, 0.12), trayMat);
    tray.position.set(WHITEBOARD_POS.x, WHITEBOARD_POS.y - frameH / 2 - 0.12, WHITEBOARD_POS.z + 0.06);
    group.add(tray);

    // Colored markers on tray
    const markerColors = [0x2C2C2C, 0xFF0000, 0x0044CC, 0x008800];
    for (let i = 0; i < markerColors.length; i++) {
        const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8),
            new THREE.MeshStandardMaterial({ color: markerColors[i] })
        );
        marker.rotation.z = Math.PI / 2;
        marker.position.set(
            WHITEBOARD_POS.x - 0.8 + i * 0.12,
            WHITEBOARD_POS.y - frameH / 2 - 0.08,
            WHITEBOARD_POS.z + 0.06
        );
        group.add(marker);
    }

    // ── Text content ──
    const textZ = WHITEBOARD_POS.z + frameD / 2 + 0.02;
    const startX = WHITEBOARD_POS.x - frameW / 2 + 0.4;

    // Title
    const title = makeText(
        '📋  Release v0.18 Summary',
        0.22, 0x2C2C2C,
        WHITEBOARD_POS.x, WHITEBOARD_POS.y + frameH / 2 - 0.35, textZ,
        'center'
    );
    group.add(title);

    // Divider line
    const dividerGeo = new THREE.PlaneGeometry(frameW - 0.8, 0.01);
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.set(WHITEBOARD_POS.x, WHITEBOARD_POS.y + frameH / 2 - 0.55, textZ);
    group.add(divider);

    // Stats lines
    const lines = [
        { icon: '✅', text: '12 New User Stories', color: 0x008800 },
        { icon: '🐛', text: '13 Bugs Fixed', color: 0xCC4400 },
        { icon: '🔧', text: '19 Tech Stories', color: 0x0044CC },
        { icon: '🏔️', text: '5 Epics Completed', color: 0x6B2FA0 },
    ];

    lines.forEach((line, i) => {
        const y = WHITEBOARD_POS.y + frameH / 2 - 0.9 - i * 0.45;

        // Icon
        const icon = makeText(line.icon, 0.22, 0x000000, startX, y, textZ, 'left');
        icon.name = `stat-icon-${i}`;
        group.add(icon);

        // Text
        const txt = makeText(line.text, 0.2, line.color, startX + 0.5, y, textZ, 'left');
        txt.name = `stat-text-${i}`;
        group.add(txt);

        // Number emphasis: a subtle colored bar behind each line
        const barGeo = new THREE.PlaneGeometry(frameW - 0.6, 0.35);
        const barMat = new THREE.MeshBasicMaterial({
            color: line.color,
            transparent: true,
            opacity: 0.06,
        });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(WHITEBOARD_POS.x, y, textZ - 0.005);
        group.add(bar);
    });

    // Make whiteboard a collider so player can't walk through
    addCollider(surface);

    return group;
}

// Track animation state
let lastProximityState = false;

/**
 * Proximity-triggered reveal animation for whiteboard text.
 */
export function animateWhiteboard(group, time, cameraPosition) {
    const dist = cameraPosition.distanceTo(
        new THREE.Vector3(WHITEBOARD_POS.x, CAMERA_HEIGHT, WHITEBOARD_POS.z)
    );

    const isNear = dist < 10;

    // Animate stat lines appearing when player is near
    for (let i = 0; i < 4; i++) {
        const icon = group.getObjectByName(`stat-icon-${i}`);
        const txt = group.getObjectByName(`stat-text-${i}`);

        if (icon && txt) {
            const targetOpacity = isNear ? 1.0 : 0.2;
            const delay = i * 0.15;
            const t = Math.max(0, Math.min(1, (time % 100) - delay));

            // Use material opacity for fade effect
            if (icon.material) {
                icon.material.opacity = THREE.MathUtils.lerp(
                    icon.material.opacity || 0.2,
                    targetOpacity,
                    0.05
                );
                icon.material.transparent = true;
            }
            if (txt.material) {
                txt.material.opacity = THREE.MathUtils.lerp(
                    txt.material.opacity || 0.2,
                    targetOpacity,
                    0.05
                );
                txt.material.transparent = true;
            }
        }
    }
}

function makeText(content, fontSize, color, x, y, z, anchor) {
    const text = new Text();
    text.text = content;
    text.fontSize = fontSize;
    text.color = color;
    text.anchorX = anchor || 'left';
    text.anchorY = 'middle';
    text.position.set(x, y, z);
    text.sync();
    return text;
}

function makeBox(w, h, d, mat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
}
