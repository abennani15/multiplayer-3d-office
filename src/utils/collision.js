import * as THREE from 'three';

/**
 * Simple AABB collision system.
 * Colliders are stored as { min: Vector3, max: Vector3 }.
 */
const colliders = [];

/**
 * Register a box collider from a mesh or explicit bounds.
 */
export function addCollider(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    return box;
}

export function addBoxCollider(min, max) {
    const box = new THREE.Box3(
        new THREE.Vector3(min.x, min.y, min.z),
        new THREE.Vector3(max.x, max.y, max.z)
    );
    colliders.push(box);
    return box;
}

/**
 * Check if a sphere (player position + radius) intersects any collider.
 * Returns the corrected position pushed out of any collision.
 */
export function resolveCollision(position, radius) {
    const playerSphere = new THREE.Sphere(position.clone(), radius);
    const corrected = position.clone();

    for (const box of colliders) {
        if (box.intersectsSphere(playerSphere)) {
            // Find closest point on box to sphere center
            const closest = new THREE.Vector3();
            box.clampPoint(playerSphere.center, closest);

            const diff = corrected.clone().sub(closest);
            const dist = diff.length();

            if (dist < radius && dist > 0.001) {
                // Push out
                diff.normalize().multiplyScalar(radius - dist);
                corrected.add(diff);
            }
        }
    }

    return corrected;
}

export function getColliders() {
    return colliders;
}
