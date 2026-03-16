import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { COLORS, ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT } from '../utils/constants.js';

export function createDecorations() {
    const group = new THREE.Group();
    group.name = 'decorations';

    // ── Balloon clusters ──
    const balloonColors = [COLORS.balloon1, COLORS.balloon2, COLORS.balloon3, COLORS.balloon4, COLORS.balloon5];
    const clusterPositions = [
        { x: -6, z: -2 },
        { x: 6, z: -2 },
        { x: -8, z: -15 },
        { x: 8, z: -15 },
        { x: -3, z: -30 },
        { x: 3, z: -30 },
        { x: 0, z: -8 },
    ];

    for (const pos of clusterPositions) {
        const cluster = createBalloonCluster(balloonColors);
        cluster.position.set(pos.x, 0, pos.z);
        group.add(cluster);
    }

    // ── Banner across the room ──
    const banner = createBanner();
    banner.position.set(0, ROOM_HEIGHT - 0.8, -3);
    group.add(banner);

    // ── Confetti particles ──
    const confetti = createConfetti();
    group.add(confetti);

    // ── Streamers from ceiling ──
    const streamerColors = [COLORS.streamer1, COLORS.streamer2, COLORS.streamer3];
    for (let i = 0; i < 8; i++) {
        const streamer = createStreamer(
            streamerColors[i % streamerColors.length]
        );
        streamer.position.set(
            (Math.random() - 0.5) * (ROOM_WIDTH - 4),
            ROOM_HEIGHT - 0.1,
            -Math.random() * (ROOM_DEPTH - 10)
        );
        group.add(streamer);
    }

    // ── Party lights (small emissive spheres strung along ceiling) ──
    const partyLights = createPartyLights();
    group.add(partyLights);

    return group;
}

function createBalloonCluster(colors) {
    const group = new THREE.Group();

    for (let i = 0; i < 4; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const balloon = createBalloon(color);
        const angle = (i / 4) * Math.PI * 2;
        const radius = 0.3;
        balloon.position.set(
            Math.cos(angle) * radius,
            ROOM_HEIGHT - 0.5 - Math.random() * 0.8,
            Math.sin(angle) * radius
        );
        // Store initial Y for animation
        balloon.userData.baseY = balloon.position.y;
        balloon.userData.phase = Math.random() * Math.PI * 2;
        group.add(balloon);
    }

    return group;
}

function createBalloon(color) {
    const group = new THREE.Group();

    // Balloon body (sphere, slightly squished vertically)
    const balloonGeo = new THREE.SphereGeometry(0.25, 16, 12);
    const balloonMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.1,
    });
    const sphere = new THREE.Mesh(balloonGeo, balloonMat);
    sphere.scale.set(1, 1.2, 1);
    sphere.castShadow = true;
    group.add(sphere);

    // Knot at bottom
    const knotGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const knot = new THREE.Mesh(knotGeo, balloonMat);
    knot.position.y = -0.28;
    group.add(knot);

    // String
    const points = [];
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        points.push(new THREE.Vector3(
            Math.sin(t * 2) * 0.03,
            -0.3 - t * 1.2,
            0
        ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const stringGeo = new THREE.TubeGeometry(curve, 10, 0.005, 4, false);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const string = new THREE.Mesh(stringGeo, stringMat);
    group.add(string);

    return group;
}

function createBanner() {
    const group = new THREE.Group();

    // Banner cloth
    const bannerGeo = new THREE.PlaneGeometry(8, 0.8);
    const bannerMat = new THREE.MeshStandardMaterial({
        color: COLORS.banner,
        side: THREE.DoubleSide,
        roughness: 0.8,
    });
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    group.add(bannerMesh);

    // Banner text
    const text = new Text();
    text.text = '🎉  v0.18 Released!  🎉';
    text.fontSize = 0.3;
    text.color = 0xFFFFFF;
    text.anchorX = 'center';
    text.anchorY = 'middle';
    text.position.z = 0.01;
    text.sync();
    group.add(text);

    // Rope / string holding the banner
    const ropeMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    // Left rope
    const ropeL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6), ropeMat);
    ropeL.position.set(-4, 0.6, 0);
    ropeL.rotation.z = 0.3;
    group.add(ropeL);
    // Right rope
    const ropeR = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6), ropeMat);
    ropeR.position.set(4, 0.6, 0);
    ropeR.rotation.z = -0.3;
    group.add(ropeR);

    return group;
}

function createConfetti() {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const confettiColors = COLORS.confetti;

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * (ROOM_WIDTH - 2);
        positions[i * 3 + 1] = Math.random() * ROOM_HEIGHT;
        positions[i * 3 + 2] = -Math.random() * (ROOM_DEPTH - 4);

        const color = new THREE.Color(confettiColors[Math.floor(Math.random() * confettiColors.length)]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
    });

    const points = new THREE.Points(geo, mat);
    points.name = 'confetti';
    return points;
}

function createStreamer(color) {
    const group = new THREE.Group();

    const points = [];
    const loops = 3 + Math.random() * 2;
    const height = 1.5 + Math.random() * 1;
    for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        points.push(new THREE.Vector3(
            Math.sin(t * loops * Math.PI * 2) * 0.15,
            -t * height,
            Math.cos(t * loops * Math.PI * 2) * 0.15
        ));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 40, 0.015, 4, false);
    const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.6,
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    return group;
}

function createPartyLights() {
    const group = new THREE.Group();
    const lightColors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x667eea, 0xFF8C94];

    // String along the ceiling in a zigzag
    const numLights = 20;
    for (let i = 0; i < numLights; i++) {
        const t = i / numLights;
        const x = (t - 0.5) * (ROOM_WIDTH - 4);
        const z = -5 - Math.sin(t * Math.PI * 3) * 3;
        const y = ROOM_HEIGHT - 0.3;

        // Small emissive bulb
        const bulbGeo = new THREE.SphereGeometry(0.06, 8, 6);
        const color = lightColors[i % lightColors.length];
        const bulbMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.8,
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(x, y, z);
        group.add(bulb);

        // Tiny wire segment
        if (i < numLights - 1) {
            const nextT = (i + 1) / numLights;
            const nx = (nextT - 0.5) * (ROOM_WIDTH - 4);
            const nz = -5 - Math.sin(nextT * Math.PI * 3) * 3;

            const wirePoints = [
                new THREE.Vector3(x, y + 0.06, z),
                new THREE.Vector3((x + nx) / 2, y + 0.15, (z + nz) / 2),
                new THREE.Vector3(nx, y + 0.06, nz),
            ];
            const wireCurve = new THREE.CatmullRomCurve3(wirePoints);
            const wireGeo = new THREE.TubeGeometry(wireCurve, 8, 0.005, 4, false);
            const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const wire = new THREE.Mesh(wireGeo, wireMat);
            group.add(wire);
        }
    }

    return group;
}

/**
 * Animate decorations (call each frame with elapsed time in seconds).
 */
export function animateDecorations(group, time) {
    // Animate balloons: gentle floating
    group.traverse((child) => {
        if (child.userData.baseY !== undefined) {
            child.position.y = child.userData.baseY + Math.sin(time * 0.8 + child.userData.phase) * 0.08;
        }
    });

    // Animate confetti: gentle falling
    const confetti = group.getObjectByName('confetti');
    if (confetti) {
        const pos = confetti.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let y = pos.getY(i);
            y -= 0.005 + Math.sin(time + i) * 0.002;
            if (y < 0) y = ROOM_HEIGHT;

            // Gentle drift
            const x = pos.getX(i) + Math.sin(time * 0.5 + i * 0.7) * 0.001;
            pos.setXY(i, x, y);
        }
        pos.needsUpdate = true;
    }
}
