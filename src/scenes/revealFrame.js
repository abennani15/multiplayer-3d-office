import * as THREE from 'three';
import { createFrame } from '../frame.js';
import { ROOM_WIDTH } from '../utils/constants.js';

let sheet;
let button;
let isRevealed = false;
let sheetVelocity = 0;
let particles = null;
let particleSpeeds = [];

export function setupRevealFrame(scene) {
    const group = new THREE.Group();
    group.name = 'revealGroup';

    // 1. The Frame
    const frame = createFrame(scene, 'V0.18\n09/03/26', {
        position: { x: ROOM_WIDTH / 2 - 0.3, y: 2.2, z: -15.5 },
        rotation: { x: 0, y: -Math.PI / 2, z: 0 },
        width: 1.0,
        height: 0.7,
    });
    // However, createFrame adds it to the scene automatically. We don't need to add it to our group.

    // 2. The Sheet
    const sheetWidth = 1.5;
    const sheetHeight = 1.3;
    const sheetGeo = new THREE.PlaneGeometry(sheetWidth, sheetHeight, 40, 40);
    const textureLoader = new THREE.TextureLoader();
    const diff = textureLoader.load('/velour_velvet/textures/velour_velvet_diff_1k.jpg');
    const normal = textureLoader.load('/velour_velvet/textures/velour_velvet_nor_gl_1k.jpg');

    diff.wrapS = THREE.RepeatWrapping;
    diff.wrapT = THREE.RepeatWrapping;
    diff.repeat.set(2, 2);
    normal.wrapS = THREE.RepeatWrapping;
    normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(2, 2);

    // Deform vertices to look draped
    const pos = sheetGeo.attributes.position;
    const frameW = 1.16 + 0.05; // slightly larger than actual frame width
    const frameH = 0.86 + 0.05;

    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);

        let localZ = 0;

        // Base wrinkles (velvet folds)
        localZ += Math.sin(x * 12 + y * 5) * 0.015;
        localZ += Math.sin(y * 15) * 0.005;

        // Fold over edges
        const overX = Math.max(0, Math.abs(x) - frameW / 2);
        const overTop = Math.max(0, y - frameH / 2);
        const overBottom = Math.max(0, -(y + frameH / 2));

        // Sides drop backwards and curve
        if (overX > 0) {
            localZ -= overX * 0.5;
            localZ -= overX * overX * 1.5;
        }

        // Top curves backwards over frame
        if (overTop > 0) {
            localZ -= overTop * overTop * 1.5;
        }

        // Bottom hangs, drops slightly towards the wall, gets wavier
        if (overBottom > 0) {
            localZ -= overBottom * 0.1;
            localZ += Math.sin(x * 15) * (overBottom * 0.15); // wavy bottom edge
        }

        // Slight bulge over the interior of the frame
        if (overX === 0 && overTop === 0 && overBottom === 0) {
            localZ += 0.01;
        }

        pos.setZ(i, localZ);
    }
    sheetGeo.computeVertexNormals();

    const sheetMat = new THREE.MeshStandardMaterial({
        map: diff,
        normalMap: normal,
        side: THREE.DoubleSide,
        color: 0xaa0000,
        roughness: 0.8, // Velvet tends to be a bit rough
        metalness: 0.1
    });
    sheet = new THREE.Mesh(sheetGeo, sheetMat);
    // Move slightly further off the wall to prevent clipping with the frame
    sheet.position.set(ROOM_WIDTH / 2 - 0.38, 2.2, -15.5);
    sheet.rotation.y = -Math.PI / 2;
    scene.add(sheet);

    // 3. The Red Button
    const buttonGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
    const buttonMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.4 });
    button = new THREE.Mesh(buttonGeo, buttonMat);
    button.position.set(ROOM_WIDTH / 2 - 1.5, 0.05, -15.5);
    scene.add(button);

    // 4. Confetti Particles System
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const colorChoices = [new THREE.Color(0xff0000), new THREE.Color(0x00ff00), new THREE.Color(0x0000ff), new THREE.Color(0xffff00), new THREE.Color(0xff00ff)];

    for (let i = 0; i < particleCount; i++) {
        // Initial cluster near the top of the frame
        positions[i * 3] = ROOM_WIDTH / 2 - 0.5;
        positions[i * 3 + 1] = 2.5;
        positions[i * 3 + 2] = -15.5;

        const col = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;

        particleSpeeds.push(new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 5 + 2,
            (Math.random() - 0.5) * 4
        ));
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0
    });

    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    return group;
}

export function updateRevealFrame(cameraPos, delta) {
    if (!isRevealed && button) {
        // Check distance to button
        const dist = Math.hypot(cameraPos.x - button.position.x, cameraPos.z - button.position.z);
        if (dist < 1.0) {
            isRevealed = true;
            // depress button
            button.position.y = 0.02;
            particles.material.opacity = 1.0;
        }
    }

    if (isRevealed) {
        // Drop the sheet
        if (sheet.position.y > -2) {
            sheetVelocity += 9.8 * delta; // gravity
            sheet.position.y -= sheetVelocity * delta;
        }

        // Update particles
        if (particles.material.opacity > 0) {
            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < particleSpeeds.length; i++) {
                particleSpeeds[i].y -= 9.8 * delta; // gravity on particles

                positions[i * 3] += particleSpeeds[i].x * delta;
                positions[i * 3 + 1] += particleSpeeds[i].y * delta;
                positions[i * 3 + 2] += particleSpeeds[i].z * delta;
            }
            particles.geometry.attributes.position.needsUpdate = true;

            // Fading out particles
            particles.material.opacity -= 0.2 * delta;
        }
    }
}
