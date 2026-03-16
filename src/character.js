import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let characterModel = null;

/**
 * Load a GLTF character model and place it in the scene.
 *
 * Handles Wolf3D / ReadyPlayerMe models that use the deprecated
 * KHR_materials_pbrSpecularGlossiness extension. After loading, we
 * traverse every mesh, correct material properties (metalness, roughness,
 * color), and ensure diffuse + normal textures are properly assigned.
 */
export function loadCharacter(scene, path, options = {}) {
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
                characterModel = gltf.scene;
                characterModel.name = 'character';

                // Apply transform
                characterModel.position.set(position.x, position.y, position.z);
                characterModel.rotation.set(rotation.x, rotation.y, rotation.z);

                if (typeof scale === 'number') {
                    characterModel.scale.setScalar(scale);
                } else {
                    characterModel.scale.set(scale.x, scale.y, scale.z);
                }

                // Access raw GLTF JSON for spec-gloss material data
                const gltfMaterials = gltf.parser?.json?.materials || [];
                const gltfTextures = gltf.parser?.json?.textures || [];
                const gltfImages = gltf.parser?.json?.images || [];
                const basePath = path.substring(0, path.lastIndexOf('/') + 1);

                characterModel.traverse((child) => {
                    if (!child.isMesh) return;

                    child.castShadow = true;
                    child.receiveShadow = true;

                    const mat = child.material;
                    if (!mat) return;

                    // Find matching GLTF material definition
                    const gltfMat = gltfMaterials.find((m) => m.name === mat.name);
                    if (!gltfMat) return;

                    const specGloss =
                        gltfMat.extensions?.KHR_materials_pbrSpecularGlossiness;
                    if (!specGloss) return;

                    // ── Fix material properties from spec-gloss data ──
                    // diffuseFactor → base color (should be white so texture shows at full brightness)
                    const df = specGloss.diffuseFactor || [1, 1, 1, 1];
                    mat.color.setRGB(df[0], df[1], df[2]);

                    // specularFactor [0,0,0] → non-metallic surface
                    mat.metalness = 0;

                    // glossinessFactor → roughness = 1 - glossiness
                    mat.roughness = 1.0 - (specGloss.glossinessFactor || 0);

                    // ── Load diffuse texture ──
                    if (!mat.map && specGloss.diffuseTexture !== undefined) {
                        const texIndex = specGloss.diffuseTexture.index;
                        const gltfTex = gltfTextures[texIndex];
                        const imageIndex = gltfTex?.source;

                        if (imageIndex !== undefined && gltfImages[imageIndex]) {
                            const textureUrl = basePath + gltfImages[imageIndex].uri;
                            const texture = new THREE.TextureLoader().load(textureUrl);
                            texture.flipY = false; // GLTF standard
                            texture.colorSpace = THREE.SRGBColorSpace;
                            mat.map = texture;
                            console.log(`  🎨 Applied diffuse texture to: ${mat.name}`);
                        }
                    }

                    // ── Load normal map ──
                    if (!mat.normalMap && gltfMat.normalTexture !== undefined) {
                        const normTexIndex = gltfMat.normalTexture.index;
                        const gltfNormTex = gltfTextures[normTexIndex];
                        const normImageIndex = gltfNormTex?.source;

                        if (normImageIndex !== undefined && gltfImages[normImageIndex]) {
                            const textureUrl = basePath + gltfImages[normImageIndex].uri;
                            const normalTex = new THREE.TextureLoader().load(textureUrl);
                            normalTex.flipY = false;
                            mat.normalMap = normalTex;
                            console.log(`  🗺️ Applied normal map to: ${mat.name}`);
                        }
                    }

                    mat.needsUpdate = true;
                });

                scene.add(characterModel);
                console.log('✅ Character model loaded successfully');
                resolve(characterModel);
            },
            (progress) => {
                const pct = progress.total
                    ? Math.round((progress.loaded / progress.total) * 100)
                    : '?';
                console.log(`Loading character: ${pct}%`);
            },
            (error) => {
                console.error('❌ Error loading character model:', error);
                reject(error);
            }
        );
    });
}

export function getCharacter() {
    return characterModel;
}
