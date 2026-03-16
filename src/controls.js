import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CAMERA_HEIGHT, PLAYER_RADIUS } from './utils/constants.js';
import { resolveCollision } from './utils/collision.js';

const _velocity = new THREE.Vector3();
const _direction = new THREE.Vector3();

const GRAVITY       = 18;   // units/s²
const JUMP_FORCE    = 7.5;  // initial upward velocity on jump

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
};

let controls = null;
let camera = null;
let _verticalVelocity = 0;
let _isGrounded = true;

export function createControls(cam, domElement) {
    camera = cam;
    controls = new PointerLockControls(cam, domElement);

    // Key bindings
    const onKeyDown = (e) => {
        switch (e.code) {
            case 'ArrowUp':    case 'KeyW': keys.forward  = true; break;
            case 'ArrowDown':  case 'KeyS': keys.backward = true; break;
            case 'ArrowLeft':  case 'KeyA': keys.left     = true; break;
            case 'ArrowRight': case 'KeyD': keys.right    = true; break;
            case 'Space':
                if (_isGrounded) {
                    _verticalVelocity = JUMP_FORCE;
                    _isGrounded = false;
                }
                e.preventDefault(); // stop page scroll
                break;
        }
    };

    const onKeyUp = (e) => {
        switch (e.code) {
            case 'ArrowUp':    case 'KeyW': keys.forward  = false; break;
            case 'ArrowDown':  case 'KeyS': keys.backward = false; break;
            case 'ArrowLeft':  case 'KeyA': keys.left     = false; break;
            case 'ArrowRight': case 'KeyD': keys.right    = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Click to lock
    const overlay = document.getElementById('overlay');
    const crosshair = document.getElementById('crosshair');

    overlay.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        overlay.classList.add('hidden');
        crosshair.classList.add('visible');
    });

    controls.addEventListener('unlock', () => {
        overlay.classList.remove('hidden');
        crosshair.classList.remove('visible');
    });

    return controls;
}

export function updateControls(delta, moveSpeed = 8) {
    if (!controls || !controls.isLocked) return;

    // Damping
    _velocity.x -= _velocity.x * 8.0 * delta;
    _velocity.z -= _velocity.z * 8.0 * delta;

    // Direction
    _direction.z = Number(keys.forward) - Number(keys.backward);
    _direction.x = Number(keys.right) - Number(keys.left);
    _direction.normalize();

    if (keys.forward || keys.backward) _velocity.z -= _direction.z * moveSpeed * delta * 10;
    if (keys.left || keys.right) _velocity.x -= _direction.x * moveSpeed * delta * 10;

    // Move
    controls.moveRight(-_velocity.x * delta);
    controls.moveForward(-_velocity.z * delta);

    // Collision resolution
    const pos = camera.position.clone();
    pos.y = 0; // project to ground for 2D collision
    const resolved = resolveCollision(pos, PLAYER_RADIUS);
    camera.position.x = resolved.x;
    camera.position.z = resolved.z;

    // Vertical: gravity + jump
    _verticalVelocity -= GRAVITY * delta;
    camera.position.y += _verticalVelocity * delta;

    if (camera.position.y <= CAMERA_HEIGHT) {
        camera.position.y   = CAMERA_HEIGHT;
        _verticalVelocity   = 0;
        _isGrounded         = true;
    }
}

export function getControls() {
    return controls;
}
