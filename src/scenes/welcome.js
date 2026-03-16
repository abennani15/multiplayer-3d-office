import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { WELCOME_POS, COLORS } from '../utils/constants.js';

export function createWelcome() {
    const group = new THREE.Group();
    group.name = 'welcome';

    // ── Main welcome text ──
    const title = new Text();
    title.text = 'Welcome to v0.18';
    title.fontSize = 0.8;
    title.font = undefined; // use default (Roboto)
    title.color = 0xFFFFFF;
    title.anchorX = 'center';
    title.anchorY = 'middle';
    title.material = new THREE.MeshStandardMaterial({
        color: COLORS.glowPrimary,
        emissive: COLORS.glowPrimary,
        emissiveIntensity: 2.0,
        toneMapped: false,
    });
    title.position.set(WELCOME_POS.x, WELCOME_POS.y, WELCOME_POS.z);
    title.sync();
    group.add(title);

    // ── Subtitle ──
    const subtitle = new Text();
    subtitle.text = '— step inside to discover what\'s new —';
    subtitle.fontSize = 0.2;
    subtitle.color = 0xCCCCCC;
    subtitle.anchorX = 'center';
    subtitle.anchorY = 'middle';
    subtitle.position.set(WELCOME_POS.x, WELCOME_POS.y - 0.7, WELCOME_POS.z);
    subtitle.sync();
    group.add(subtitle);

    // ── Sparkle particles around the text ──
    const sparkleCount = 60;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleColors = new Float32Array(sparkleCount * 3);

    for (let i = 0; i < sparkleCount; i++) {
        sparklePositions[i * 3] = WELCOME_POS.x + (Math.random() - 0.5) * 6;
        sparklePositions[i * 3 + 1] = WELCOME_POS.y + (Math.random() - 0.5) * 2;
        sparklePositions[i * 3 + 2] = WELCOME_POS.z + (Math.random() - 0.5) * 2;

        const c = new THREE.Color().setHSL(0.65 + Math.random() * 0.15, 0.8, 0.7);
        sparkleColors[i * 3] = c.r;
        sparkleColors[i * 3 + 1] = c.g;
        sparkleColors[i * 3 + 2] = c.b;
    }

    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    sparkleGeo.setAttribute('color', new THREE.BufferAttribute(sparkleColors, 3));

    const sparkleMat = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    sparkles.name = 'sparkles';
    group.add(sparkles);

    // ── Glowing ring behind text ──
    const ringGeo = new THREE.TorusGeometry(2.5, 0.03, 8, 64);
    const ringMat = new THREE.MeshStandardMaterial({
        color: COLORS.glowSecondary,
        emissive: COLORS.glowSecondary,
        emissiveIntensity: 1.5,
        toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(WELCOME_POS.x, WELCOME_POS.y, WELCOME_POS.z - 0.2);
    ring.name = 'glowRing';
    group.add(ring);

    // Point light for local glow
    const glowLight = new THREE.PointLight(COLORS.glowPrimary, 3, 10, 1.5);
    glowLight.position.set(WELCOME_POS.x, WELCOME_POS.y, WELCOME_POS.z + 1);
    group.add(glowLight);

    return group;
}

/**
 * Animate welcome scene elements.
 */
export function animateWelcome(group, time) {
    // Float the text up and down
    const title = group.children[0]; // main text
    if (title) {
        title.position.y = WELCOME_POS.y + Math.sin(time * 1.2) * 0.1;
    }

    // Rotate glow ring
    const ring = group.getObjectByName('glowRing');
    if (ring) {
        ring.rotation.z = time * 0.3;
        ring.rotation.x = Math.sin(time * 0.5) * 0.15;
    }

    // Sparkle animation
    const sparkles = group.getObjectByName('sparkles');
    if (sparkles) {
        const pos = sparkles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let y = pos.getY(i);
            y += Math.sin(time * 2 + i * 1.7) * 0.003;
            pos.setY(i, y);

            let x = pos.getX(i);
            x += Math.cos(time * 1.5 + i * 0.9) * 0.002;
            pos.setX(i, x);
        }
        pos.needsUpdate = true;
        sparkles.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
    }
}
