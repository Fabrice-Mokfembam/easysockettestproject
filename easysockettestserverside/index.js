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
    requestTimeout: 50000 
  }
};

const pool = new sql.ConnectionPool(config);
// Connect to the pool 
const poolConnectPromise = pool.connect();

const WS_PORT = 8087;
const WS_PATH = '/websocket';
const server = new MyWebSocketServer(WS_PORT, WS_PATH); 

// Express app for webhook
const app = express();
app.use(express.json());

/**
 * Fetch employee data
 */
async function fetchEmployeeData() {
  try {
    await poolConnectPromise; 
    const request = pool.request();
    
    // The query fetches all employees from the database
    const result = await request.query(`
      SELECT
        employee_id AS WorkerID,
        first_name AS FirstName,
        last_name AS LastName,
        department AS Department,
        salary AS Salary
      FROM dbo.employees WITH (NOLOCK)
    `);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching employee data:', err);
    return [];
  }
}

// Webhook endpoint for SQL trigger
app.post('/db-change', async (req, res) => {

  console.log('🔔 Received DB change notification from SQL Server.');
  
  // Log the specific changes received in the webhook body
  const { inserted, deleted } = req.body;
  
  if (inserted && inserted.length > 0) {
    console.log('✨ Records INSERTED or UPDATED:');
    console.log(inserted);
  }
  
  if (deleted && deleted.length > 0) {
    console.log('🗑️ Records DELETED or UPDATED:');
    console.log(deleted);
  }

  try {
    // Fetch the latest employee data
    const employeeData = await fetchEmployeeData();
    console.log(`✅ Successfully fetched ${employeeData.length} employee records from the database.`);
    
    // Broadcast the updated data to all connected WebSocket clients
    server.broadcastMessage({
      type: 'employeeDataUpdate',
      content: employeeData,
      serverTime: new Date().toLocaleTimeString(),
      clientsOnline: server.getConnectedClientCount()
    });

    // Log the broadcast event to the console
    console.log(`📡 Broadcasted updated employee data to ${server.getConnectedClientCount()} clients at ${new Date().toLocaleTimeString()}`);
    
    // Send a success status back to the SQL Server trigger
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error in /db-change webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Start WebSocket Server and Express webhook
 */
async function startServers() {
  try {
    // Start WebSocket server
    await server.start();
    console.log(`✅ WebSocket server is running at ws://localhost:${WS_PORT}${WS_PATH}`);

    // Start Express webhook server
    app.listen(5000, () => {
      console.log('✅ Webhook server listening on http://localhost:5000/db-change');
    });

    // Connect to SQL Server
    await poolConnectPromise;
    console.log('✅ Connected to SQL Server!');

    // Handle new client connections
    server.onClientConnect(async (client) => {
      console.log('➕ New client connected. Sending initial employee data...');
      const employeeData = await fetchEmployeeData();
      server.sendMessage(client, {
        type: 'employeeDataUpdate',
        content: employeeData,
        serverTime: new Date().toLocaleTimeString(),
        clientsOnline: server.getConnectedClientCount()
      });
      console.log(`✅ Sent initial data to new client. Total clients online: ${server.getConnectedClientCount()}`);
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


// Start all servers
startServers();