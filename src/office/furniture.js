import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { COLORS, ROOM_WIDTH, ROOM_DEPTH } from '../utils/constants.js';
import { addCollider } from '../utils/collision.js';

export function createFurniture() {
    const group = new THREE.Group();
    group.name = 'furniture';

    // ── Desks along left wall ──
    // Note: Desks are now loaded as GLTF models in main.js
    const whiteboardTexts = [
        { title: 'NEXTG-11138', subtitle: 'Event tracking for Dashboard' },
        { title: 'NEXTG-11771', subtitle: 'Data export' },
        { title: 'NEXTG-11707', subtitle: 'Horizontal Stack' },
    ];

    for (let i = 0; i < 3; i++) {
        // Chair for each desk
        // const chair = createChair();
        // chair.position.set(-ROOM_WIDTH / 2 + 4.5, 0, -4 - i * 8);
        // chair.rotation.y = -Math.PI / 2;
        // group.add(chair);
        // addCollider(chair);

        // Small whiteboard behind each desk on the wall
        const smallWhiteboard = createSmallWhiteboard(whiteboardTexts[i]);
        smallWhiteboard.position.set(-ROOM_WIDTH / 2 + 0.15, 2, -4 - i * 8);
        smallWhiteboard.rotation.y = Math.PI / 2;
        group.add(smallWhiteboard);
    }

    // ── Central conference table ──
    const confTable = createConferenceTable();
    confTable.position.set(5, 0, -12);
    group.add(confTable);
    addCollider(confTable);

    // Chairs around conference table
    const chairPositions = [
        { x: 3, z: -12, ry: Math.PI / 2 },
        { x: 7, z: -12, ry: -Math.PI / 2 },
        { x: 5, z: -10.5, ry: Math.PI },
        { x: 5, z: -13.5, ry: 0 },
    ];
    for (const cp of chairPositions) {
        const ch = createChair();
        ch.position.set(cp.x, 0, cp.z);
        ch.rotation.y = cp.ry;
        group.add(ch);
        addCollider(ch);
    }

    // ── Bookshelf on back wall ──
    const shelf = createBookshelf();
    shelf.position.set(-ROOM_WIDTH / 2 + 2, 0, -ROOM_DEPTH + 6);
    group.add(shelf);
    addCollider(shelf);

    // ── Small side table near entrance ──
    const sideTable = createSideTable();
    sideTable.position.set(6, 0, 1);
    group.add(sideTable);
    addCollider(sideTable);

    return group;
}

function createDesk() {
    const group = new THREE.Group();

    const topMat = new THREE.MeshStandardMaterial({
        color: COLORS.desk,
        roughness: 0.6,
        metalness: 0.05,
    });
    const legMat = new THREE.MeshStandardMaterial({
        color: COLORS.deskLeg,
        roughness: 0.4,
        metalness: 0.5,
    });

    // Desktop surface
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 1), topMat);
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.05, 0.75, 0.05);
    const positions = [
        [-0.9, 0.375, -0.45],
        [0.9, 0.375, -0.45],
        [-0.9, 0.375, 0.45],
        [0.9, 0.375, 0.45],
    ];
    for (const [x, y, z] of positions) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, y, z);
        leg.castShadow = true;
        group.add(leg);
    }

    // Monitor on desk
    const monitor = createMonitor();
    monitor.position.set(0, 0.78, -0.2);
    group.add(monitor);

    return group;
}

function createMonitor() {
    const group = new THREE.Group();

    // Screen
    const screenMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x1a1a2e,
        emissiveIntensity: 0.3,
    });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.02), screenMat);
    screen.position.y = 0.35;
    group.add(screen);

    // Stand
    const standMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.05), standMat);
    stand.position.y = 0.075;
    group.add(stand);

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.15), standMat);
    group.add(base);

    return group;
}

function createChair() {
    const group = new THREE.Group();

    const seatMat = new THREE.MeshStandardMaterial({
        color: COLORS.chair,
        roughness: 0.7,
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: COLORS.chairAccent,
        roughness: 0.5,
    });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), seatMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), accentMat);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);

    // Legs (4 simple cylinders)
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 });
    const legPos = [
        [-0.2, 0.225, -0.2],
        [0.2, 0.225, -0.2],
        [-0.2, 0.225, 0.2],
        [0.2, 0.225, 0.2],
    ];
    for (const [x, y, z] of legPos) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, y, z);
        group.add(leg);
    }

    return group;
}

function createConferenceTable() {
    const group = new THREE.Group();

    const topMat = new THREE.MeshStandardMaterial({
        color: 0x5C4033,
        roughness: 0.5,
        metalness: 0.1,
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 2), topMat);
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Central pedestal
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.74, 12), pedMat);
    ped.position.y = 0.37;
    group.add(ped);

    return group;
}

function createBookshelf() {
    const group = new THREE.Group();

    const shelfMat = new THREE.MeshStandardMaterial({
        color: COLORS.shelf,
        roughness: 0.6,
    });

    // Frame
    const frameW = 2;
    const frameH = 3;
    const frameD = 0.4;

    // Back panel
    group.add(makeBox(frameW, frameH, 0.05, shelfMat, 0, frameH / 2, -frameD / 2 + 0.025));
    // Left side
    group.add(makeBox(0.05, frameH, frameD, shelfMat, -frameW / 2, frameH / 2, 0));
    // Right side
    group.add(makeBox(0.05, frameH, frameD, shelfMat, frameW / 2, frameH / 2, 0));

    // Shelves
    for (let i = 0; i < 4; i++) {
        const y = 0.05 + i * 0.75;
        group.add(makeBox(frameW, 0.04, frameD, shelfMat, 0, y, 0));

        // Books on each shelf
        const numBooks = 5 + Math.floor(Math.random() * 4);
        for (let j = 0; j < numBooks; j++) {
            const bookH = 0.2 + Math.random() * 0.3;
            const bookW = 0.04 + Math.random() * 0.06;
            const bookColor = COLORS.confetti[Math.floor(Math.random() * COLORS.confetti.length)];
            const bookMat = new THREE.MeshStandardMaterial({ color: bookColor, roughness: 0.8 });
            const book = new THREE.Mesh(
                new THREE.BoxGeometry(bookW, bookH, frameD * 0.8),
                bookMat
            );
            book.position.set(-frameW / 2 + 0.15 + j * 0.2, y + 0.04 + bookH / 2, 0);
            book.castShadow = true;
            group.add(book);
        }
    }

    return group;
}

function createSideTable() {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({ color: COLORS.desk, roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6), mat);
    top.position.y = 0.55;
    top.castShadow = true;
    group.add(top);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: COLORS.deskLeg, metalness: 0.5 });
    const legPos = [[-0.25, 0.275, -0.25], [0.25, 0.275, -0.25], [-0.25, 0.275, 0.25], [0.25, 0.275, 0.25]];
    for (const [x, y, z] of legPos) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, y, z);
        group.add(leg);
    }

    return group;
}

function createSmallWhiteboard(textContent) {
    const group = new THREE.Group();

    // Smaller dimensions than main whiteboard
    const frameW = 1.8;
    const frameH = 1.35;
    const frameD = 0.12;

    // Dark frame material
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x3A3A3A,
        roughness: 0.4,
        metalness: 0.3,
    });

    // Frame pieces
    // Top
    group.add(makeBox(frameW + 0.1, 0.05, frameD, frameMat, 0, frameH / 2 + 0.025, 0));
    // Bottom
    group.add(makeBox(frameW + 0.1, 0.05, frameD, frameMat, 0, -frameH / 2 - 0.025, 0));
    // Left
    group.add(makeBox(0.05, frameH + 0.1, frameD, frameMat, -frameW / 2 - 0.025, 0, 0));
    // Right
    group.add(makeBox(0.05, frameH + 0.1, frameD, frameMat, frameW / 2 + 0.025, 0, 0));

    // White surface
    const surfaceMat = new THREE.MeshStandardMaterial({
        color: COLORS.whiteboardBg,
        roughness: 0.3,
        metalness: 0.02,
    });
    const surface = new THREE.Mesh(
        new THREE.BoxGeometry(frameW, frameH, frameD * 0.7),
        surfaceMat
    );
    surface.position.set(0, 0, -0.005);
    surface.receiveShadow = true;
    group.add(surface);

    // Small marker tray at bottom
    const trayMat = new THREE.MeshStandardMaterial({ 
        color: 0x666666, 
        metalness: 0.4,
        roughness: 0.5
    });
    const tray = new THREE.Mesh(
        new THREE.BoxGeometry(frameW + 0.1, 0.045, 0.12), 
        trayMat
    );
    tray.position.set(0, -frameH / 2 - 0.09, frameD / 2 + 0.06);
    tray.castShadow = true;
    group.add(tray);

    // A couple of markers in tray
    const markerColors = [0x2C2C2C, 0xFF0000, 0x0044CC];
    for (let i = 0; i < markerColors.length; i++) {
        const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6),
            new THREE.MeshStandardMaterial({ color: markerColors[i] })
        );
        marker.rotation.z = Math.PI / 2;
        marker.position.set(
            -0.225 + i * 0.12,
            -frameH / 2 - 0.06,
            frameD / 2 + 0.06
        );
        group.add(marker);
    }

    // Add text if provided
    if (textContent) {
        const textZ = frameD / 2 + 0.01;

        // Title (e.g., "NEXTG-11601")
        const title = new Text();
        title.text = textContent.title;
        title.fontSize = 0.15;
        title.color = 0x1a1a1a;
        title.anchorX = 'center';
        title.anchorY = 'middle';
        title.position.set(0, 0.25, textZ);
        title.fontStyle = 'italic';
        title.fontWeight = 600;
        // Slight rotation for handwritten feel
        title.rotation.z = -0.02;
        title.sync();
        group.add(title);

        // Subtitle (e.g., "Audit Trail")
        const subtitle = new Text();
        subtitle.text = textContent.subtitle;
        subtitle.fontSize = 0.12;
        subtitle.color = 0x2a2a2a;
        subtitle.anchorX = 'center';
        subtitle.anchorY = 'middle';
        subtitle.position.set(0, 0.05, textZ);
        subtitle.fontStyle = 'italic';
        subtitle.fontWeight = 500;
        subtitle.rotation.z = 0.015;
        subtitle.sync();
        group.add(subtitle);
    }

    // Add collider so player can't walk through
    addCollider(surface);

    return group;
}

function makeBox(w, h, d, mat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
}
