import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

// id → { ws, name, character, x, y, z }
const players = new Map();

wss.on('connection', (ws) => {
    const id = randomUUID();

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type === 'join') {
            // Sanitise input
            const safeName = String(msg.name ?? 'Player')
                .slice(0, 32)
                .replace(/[<>&"'`]/g, '');
            const safeChar = ['male_character_7', 'man_in_suit'].includes(msg.character)
                ? msg.character
                : 'male_character_7';

            const player = { ws, name: safeName, character: safeChar, x: 0, y: 1.7, z: 0 };
            players.set(id, player);

            // Send this client their ID and the current player list
            const existing = [];
            for (const [pid, p] of players) {
                if (pid !== id) {
                    existing.push({ id: pid, name: p.name, character: p.character, x: p.x, y: p.y, z: p.z });
                }
            }
            send(ws, { type: 'welcome', id, players: existing });

            // Notify everyone else
            broadcast(id, { type: 'playerJoined', id, name: safeName, character: safeChar, x: 0, y: 1.7, z: 0 });
            console.log(`[+] ${safeName} joined (${id.slice(0, 8)}) — ${players.size} online`);
        }

        if (msg.type === 'move') {
            const player = players.get(id);
            if (!player) return;
            player.x = Number(msg.x) || 0;
            player.y = Number(msg.y) || 0;
            player.z = Number(msg.z) || 0;
            broadcast(id, { type: 'playerMoved', id, x: player.x, y: player.y, z: player.z });
        }

        if (msg.type === 'reaction') {
            const player = players.get(id);
            if (!player) return;
            const allowed = ['😂', '👍🏻', '🔥', '🤖', '😍'];
            if (!allowed.includes(msg.emoji)) return;
            broadcast(id, { type: 'reaction', id, emoji: msg.emoji });
        }
    });

    ws.on('close', () => {
        const player = players.get(id);
        if (player) {
            console.log(`[-] ${player.name} left (${id.slice(0, 8)}) — ${players.size - 1} online`);
        }
        players.delete(id);
        broadcast(id, { type: 'playerLeft', id });
    });

    ws.on('error', (err) => console.error(`WS error [${id.slice(0, 8)}]:`, err.message));
});

function send(ws, msg) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(excludeId, msg) {
    const data = JSON.stringify(msg);
    for (const [pid, p] of players) {
        if (pid !== excludeId && p.ws.readyState === p.ws.OPEN) {
            p.ws.send(data);
        }
    }
}

console.log(`✅  WebSocket server listening on ws://localhost:${PORT}`);
