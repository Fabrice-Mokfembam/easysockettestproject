import MyWebSocketServer from '@mokfembam/easysocket-server';

import sql from 'mssql';


const config = 
{
  server: 'DESKTOP-3L9H3VU',
  driver:"msnodesqlv8",
  database: 'TestDB',
  options: {
    trustedConnection: true, 
    enableArithAort:true,
    encrypt: true, 
    trustServerCertificate: true ,

  }
}

async function connectAndQuery() {
    try {
        console.log('Attempting to connect to SQL Server...');
        const pool = await sql.connect(config);
        console.log('Successfully connected to SQL Server!');

        const request = pool.request();
        console.log('Executing query: SELECT * FROM Workers');
        const result = await request.query('SELECT WorkerID, FirstName, LastName, Department, Salary FROM Workers');

        console.log('Query Results:');
        console.table(result.recordset); 

    
        await pool.close();
        console.log('Connection closed.');

    } catch (err) {

        console.error('Database operation failed:', err);
    }
}




const WS_PORT = 8080;
const WS_PATH = '/websocket'; 

const server = new MyWebSocketServer(WS_PORT, WS_PATH);

server.start()
    .then(() => {
        console.log(`WebSocket server is running on ws://localhost:${WS_PORT}${WS_PATH}`);
        console.log('Waiting for clients to connect...');
        // connectAndQuery();
    })
    .catch(err => {
        console.error('Failed to start WebSocket server:', err);
        process.exit(1);
    });

// --- Server-side Logic for Handling Messages ---


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