import * as THREE from 'three';
import { Text } from 'troika-three-text';

/**
 * Create a simple golden picture frame with text inside.
 */
export function createFrame(scene, textContent, options = {}) {
    const {
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        width = 1.2,
        height = 0.8,
    } = options;

    const frameGroup = new THREE.Group();
    frameGroup.name = 'picture-frame';

    // Frame dimensions
    const frameThickness = 0.08;
    const frameDepth = 0.05;

    // Golden material for frame
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 0.6,
        roughness: 0.3,
    });

    // Background (white canvas/paper)
    const backgroundGeo = new THREE.PlaneGeometry(width, height);
    const backgroundMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFF0,
        roughness: 0.9,
    });
    const background = new THREE.Mesh(backgroundGeo, backgroundMat);
    background.position.z = 0.001;
    background.receiveShadow = true;
    frameGroup.add(background);

    // Frame border pieces (top, bottom, left, right)
    // Top
    const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
        frameMaterial
    );
    topFrame.position.set(0, height / 2 + frameThickness / 2, frameDepth / 2);
    topFrame.castShadow = true;
    frameGroup.add(topFrame);

    // Bottom
    const bottomFrame = topFrame.clone();
    bottomFrame.position.set(0, -height / 2 - frameThickness / 2, frameDepth / 2);
    frameGroup.add(bottomFrame);

    // Left
    const leftFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frameThickness, height, frameDepth),
        frameMaterial
    );
    leftFrame.position.set(-width / 2 - frameThickness / 2, 0, frameDepth / 2);
    leftFrame.castShadow = true;
    frameGroup.add(leftFrame);

    // Right
    const rightFrame = leftFrame.clone();
    rightFrame.position.set(width / 2 + frameThickness / 2, 0, frameDepth / 2);
    frameGroup.add(rightFrame);

    // Add text
    const text = new Text();
    text.text = textContent;
    text.fontSize = 0.15;
    text.color = 0x000000;
    text.anchorX = 'center';
    text.anchorY = 'middle';
    text.textAlign = 'center';
    text.position.set(0, 0, 0.03);
    text.sync();
    frameGroup.add(text);

    // Apply transform
    frameGroup.position.set(position.x, position.y, position.z);
    frameGroup.rotation.set(rotation.x, rotation.y, rotation.z);

    scene.add(frameGroup);
    console.log('✅ Picture frame created successfully at', frameGroup.position);
    
    return frameGroup;
}
