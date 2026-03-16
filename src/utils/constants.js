// ── Room dimensions ──
export const ROOM_WIDTH = 30;
export const ROOM_DEPTH = 40;
export const ROOM_HEIGHT = 4.5;
export const WALL_THICKNESS = 0.3;

// ── Camera / Player ──
export const CAMERA_HEIGHT = 1.7;
export const MOVE_SPEED = 8;
export const PLAYER_RADIUS = 0.4;

// ── Colors ──
export const COLORS = {
    // Office
    floor: 0x8B7355,          // warm wood
    floorAlt: 0x7A6548,       // darker wood strip
    walls: 0xF5F0E8,          // warm off-white
    ceiling: 0xFAF8F5,        // light cream
    trim: 0x5C4033,           // dark wood trim
    window: 0xADD8E6,         // sky blue

    // Furniture
    desk: 0x6B4F3A,           // dark wood
    deskLeg: 0x4A4A4A,        // metal grey
    chair: 0x2C2C2C,          // dark charcoal
    chairAccent: 0x667eea,    // brand purple-blue
    shelf: 0x8B7355,          // wood

    // Festive
    balloon1: 0xFF6B6B,       // coral red
    balloon2: 0x4ECDC4,       // teal
    balloon3: 0xFFE66D,       // yellow
    balloon4: 0x667eea,       // purple-blue
    balloon5: 0xFF8C94,       // pink
    banner: 0x764BA2,         // deep purple
    confetti: [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x667eea, 0xFF8C94, 0xFFA07A, 0x98D8C8],
    streamer1: 0xFF6B6B,
    streamer2: 0x667eea,
    streamer3: 0xFFE66D,

    // Glow / Welcome text
    glowPrimary: 0x667eea,
    glowSecondary: 0x764ba2,

    // Whiteboard
    whiteboardBg: 0xFCFCFC,
    whiteboardFrame: 0x3A3A3A,
    whiteboardText: 0x2C2C2C,
};

// ── Positions ──
export const WELCOME_POS = { x: 0, y: 2.2, z: -5 };
export const WHITEBOARD_POS = { x: 0, y: 2.2, z: -18 };

export const SPAWN_POS = { x: 0, y: CAMERA_HEIGHT, z: 2 };

// ── Lighting ──
export const AMBIENT_INTENSITY = 0.6;
export const DIR_LIGHT_INTENSITY = 0.8;
