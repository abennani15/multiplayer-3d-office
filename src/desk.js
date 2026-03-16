import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Load a GLTF desk model and place it in the scene.
 */
export function loadDesk(scene, path, options = {}) {
    const {
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        scale = 1,
    } = options;

    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (gltf) => {
                const deskModel = gltf.scene;
                deskModel.name = 'desk';

                // Apply transform
                deskModel.position.set(position.x, position.y, position.z);
                deskModel.rotation.set(rotation.x, rotation.y, rotation.z);

                if (typeof scale === 'number') {
                    deskModel.scale.setScalar(scale);
                } else {
                    deskModel.scale.set(scale.x, scale.y, scale.z);
                }

                // Enable shadows
                deskModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                scene.add(deskModel);
                resolve(deskModel);
            },
            undefined,
            (error) => {
                console.error('Desk loading error:', error);
                reject(error);
            }
        );
    });
}
