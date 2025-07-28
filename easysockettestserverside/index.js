import sql from 'mssql';
import MyWebSocketServer from '@mokfembam/easysocket-server';
import express from 'express';

const config = {
  server: 'localhost',
  database: 'ITsolution',
  user: 'sa',
  password: 'ABCdef123.',
  port: 1433,
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

const WS_PORT = 8087;
const WS_PATH = '/websocket';
const HTTP_PORT = 3000; // HTTP server for Python notifications
const server = new MyWebSocketServer(WS_PORT, WS_PATH);
const app = express();


app.use(express.json());

/**
 * Fetch employee data
 */
async function fetchEmployeeData() {
  try {
    await poolConnect;
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        employee_id AS WorkerID, 
        first_name AS FirstName, 
        last_name AS LastName, 
        department AS Department, 
        salary AS Salary 
      FROM dbo.employees
    `);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching employee data:', err);
    return [];
  }
}

/**
 * HTTP Endpoint for Python activator notifications
 */
app.post('/db-notification', async (req, res) => {
  try {
    console.log('📩 Received notification from Python activator:', req.body);

    // Fetch and broadcast updated employee data
    const employeeData = await fetchEmployeeData();
    if (server.getConnectedClientCount() > 0) {
      server.broadcastMessage({
        type: 'employeeDataUpdate',
        content: employeeData,
        serverTime: new Date().toLocaleTimeString(),
        clientsOnline: server.getConnectedClientCount()
      });
      console.log(`✅ Broadcasted to ${server.getConnectedClientCount()} clients.`);
    }

    res.status(200).send('Notification received');
  } catch (err) {
    console.error('❌ Error processing notification:', err);
    res.status(500).send('Error processing notification');
  }
});

/**
 * Start WebSocket and HTTP Servers
 */
async function startServers() {
  try {
    // Start WebSocket server
    await server.start();
    console.log(`✅ WebSocket server is running at ws://localhost:${WS_PORT}${WS_PATH}`);

    // Start HTTP server
    app.listen(HTTP_PORT, () => {
      console.log(`✅ HTTP server is running at http://localhost:${HTTP_PORT}`);
    });

    // Connect to SQL Server
    await poolConnect;
    console.log('✅ Connected to SQL Server!');

    // Handle new WebSocket client connection
    server.onClientConnect(async (client) => {
      console.log('➕ New client connected. Sending initial employee data...');
      const employeeData = await fetchEmployeeData();
      server.sendMessage(client, {
        type: 'employeeDataUpdate',
        content: employeeData,
        serverTime: new Date().toLocaleTimeString(),
        clientsOnline: server.getConnectedClientCount()
      });
    });
  } catch (err) {
    console.error('❌ Failed to start servers:', err);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
async function shutdown() {
  console.log('🔻 Shutting down...');
  await server.stop();
  try {
    await pool.close();
    console.log('✅ SQL Server connection closed.');
  } catch (err) {
    console.error('❌ Error closing SQL connection:', err);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);


startServers();