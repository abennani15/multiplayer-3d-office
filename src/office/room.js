import * as THREE from 'three';
import {
    ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT, WALL_THICKNESS,
    COLORS,
} from '../utils/constants.js';
import { addCollider, addBoxCollider } from '../utils/collision.js';

export function createRoom() {
    const group = new THREE.Group();
    group.name = 'room';

    // ── Floor ──
    const textureLoader = new THREE.TextureLoader();
    
    // Load floor textures
    const floorDiffuse = textureLoader.load('/laminate_floor_02_4k/textures/laminate_floor_02_diff_4k.jpg');
    const floorNormal = textureLoader.load('/laminate_floor_02_4k/textures/laminate_floor_02_nor_gl_4k.jpg');
    const floorRoughness = textureLoader.load('/laminate_floor_02_4k/textures/laminate_floor_02_rough_4k.jpg');
    
    // Configure texture wrapping and repeat
    [floorDiffuse, floorNormal, floorRoughness].forEach(texture => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 10); // Adjust for realistic plank size
    });
    
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshStandardMaterial({
        map: floorDiffuse,
        normalMap: floorNormal,
        roughnessMap: floorRoughness,
        roughness: 0.8,
        metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -ROOM_DEPTH / 2 + 5);
    floor.receiveShadow = true;
    group.add(floor);

    // ── Ceiling ──
    const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const ceilMat = new THREE.MeshStandardMaterial({
        color: COLORS.ceiling,
        roughness: 0.9,
    });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, ROOM_HEIGHT, -ROOM_DEPTH / 2 + 5);
    group.add(ceil);

    // Ceiling light panels
    const lightPanelGeo = new THREE.PlaneGeometry(2, 4);
    const lightPanelMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFEE,
        emissiveIntensity: 0.5,
    });
    for (let i = 0; i < 3; i++) {
        const panel = new THREE.Mesh(lightPanelGeo, lightPanelMat);
        panel.rotation.x = Math.PI / 2;
        panel.position.set(0, ROOM_HEIGHT - 0.01, -5 - i * 10);
        group.add(panel);
    }

    // ── Walls ──
    const wallMat = new THREE.MeshStandardMaterial({
        color: COLORS.walls,
        roughness: 0.7,
    });

    // Back wall
    const backWall = createWall(ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS, wallMat);
    backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH + 5);
    group.add(backWall);
    addCollider(backWall);

    // Front wall (with opening for "entrance" feel)
    const frontWallLeft = createWall(ROOM_WIDTH / 2 - 2, ROOM_HEIGHT, WALL_THICKNESS, wallMat);
    frontWallLeft.position.set(-ROOM_WIDTH / 4 - 1, ROOM_HEIGHT / 2, 5);
    group.add(frontWallLeft);
    addCollider(frontWallLeft);

    const frontWallRight = createWall(ROOM_WIDTH / 2 - 2, ROOM_HEIGHT, WALL_THICKNESS, wallMat);
    frontWallRight.position.set(ROOM_WIDTH / 4 + 1, ROOM_HEIGHT / 2, 5);
    group.add(frontWallRight);
    addCollider(frontWallRight);

    // Top piece above entrance
    const frontWallTop = createWall(4, ROOM_HEIGHT - 2.8, WALL_THICKNESS, wallMat);
    frontWallTop.position.set(0, ROOM_HEIGHT - (ROOM_HEIGHT - 2.8) / 2, 5);
    group.add(frontWallTop);

    // Left wall
    const leftWall = createWall(WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH, wallMat);
    leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2 + 5);
    group.add(leftWall);
    addCollider(leftWall);

    // Right wall (with windows)
    const rightWall = createWall(WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH, wallMat);
    rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2 + 5);
    group.add(rightWall);
    addCollider(rightWall);

    // ── Windows on right wall ──
    for (let i = 0; i < 3; i++) {
        const windowGroup = createWindow();
        windowGroup.position.set(ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - 0.01, 2.2, -3 - i * 10);
        windowGroup.rotation.y = -Math.PI / 2;
        group.add(windowGroup);
    }

    // ── Baseboard trim ──
    const trimMat = new THREE.MeshStandardMaterial({
        color: COLORS.trim,
        roughness: 0.5,
    });
    // Left baseboard
    const trimLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.15, ROOM_DEPTH),
        trimMat
    );
    trimLeft.position.set(-ROOM_WIDTH / 2 + 0.2, 0.075, -ROOM_DEPTH / 2 + 5);
    group.add(trimLeft);
    // Right baseboard
    const trimRight = trimLeft.clone();
    trimRight.position.set(ROOM_WIDTH / 2 - 0.2, 0.075, -ROOM_DEPTH / 2 + 5);
    group.add(trimRight);

    return group;
}

function createWall(w, h, d, material) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createWindow() {
    const group = new THREE.Group();

    // Window frame
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.6,
        roughness: 0.3,
    });

    // Frame border pieces
    const frameW = 3;
    const frameH = 2;
    const frameD = 0.08;
    const bar = 0.1;

    // top
    group.add(makeBox(frameW, bar, frameD, frameMat, 0, frameH / 2, 0));
    // bottom
    group.add(makeBox(frameW, bar, frameD, frameMat, 0, -frameH / 2, 0));
    // left
    group.add(makeBox(bar, frameH, frameD, frameMat, -frameW / 2, 0, 0));
    // right
    group.add(makeBox(bar, frameH, frameD, frameMat, frameW / 2, 0, 0));
    // center divider
    group.add(makeBox(bar * 0.7, frameH, frameD, frameMat, 0, 0, 0));

    // Glass pane
    const glassMat = new THREE.MeshStandardMaterial({
        color: COLORS.window,
        transparent: true,
        opacity: 0.3,
        emissive: 0x87CEEB,
        emissiveIntensity: 0.15,
    });
    const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(frameW - bar * 2, frameH - bar * 2),
        glassMat
    );
    glass.position.z = 0.01;
    group.add(glass);

    return group;
}

function makeBox(w, h, d, mat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
}
