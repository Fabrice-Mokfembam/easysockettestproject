import MyWebSocketServer from '@mokfembam/easysocket-server';


const WS_PORT = 8080;
const WS_PATH = '/websocket'; 

const server = new MyWebSocketServer(WS_PORT, WS_PATH);

server.start()
    .then(() => {
        console.log(`WebSocket server is running on ws://localhost:${WS_PORT}${WS_PATH}`);
        console.log('Waiting for clients to connect...');
    })
    .catch(err => {
        console.error('Failed to start WebSocket server:', err);
        process.exit(1);
    });

// --- Server-side Logic for Handling Messages ---

// You can interact with the server instance to send messages:
// Example: Broadcast a message to all connected clients every 10 seconds
setInterval(() => {
    if (server.getConnectedClientCount() > 0) {
        server.broadcastMessage({
            type: 'serverUpdate',
            content: `Current server time: ${new Date().toLocaleTimeString()}`,
            clientsOnline: server.getConnectedClientCount()
        });
        console.log(`Broadcasted server update to ${server.getConnectedClientCount()} clients.`);
    }
}, 10000);

// --- Graceful Shutdown (Important for Node.js servers) ---
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Shutting down server...');
    await server.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Shutting down server...');
    await server.stop();
    process.exit(0);
});