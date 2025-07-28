import sql from 'mssql';
import MyWebSocketServer from '@mokfembam/easysocket-server';

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
const server = new MyWebSocketServer(WS_PORT, WS_PATH);

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
      FROM employees
    `);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching employee data:', err);
    return [];
  }
}

/**
 * Listen to Service Broker Queue
 */
async function listenToServiceBrokerQueue() {
  try {
    const pool = await poolConnect;
    console.log('🎧 Listening to EmployeeChangeQueue...');
      const result = await pool.request().query(`
        WAITFOR (
          RECEIVE TOP(1)
            conversation_handle,
            message_type_name,
            message_body
          FROM EmployeeChangeQueue
        );
      `);
      const message = result.recordset[0];
      if (message) {
        const body = message.message_body.toString('utf8');
        console.log('📩 New Service Broker Message:', body);

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

        await pool.request().query(`
          END CONVERSATION '${message.conversation_handle}';
        `);
      }
    
  } catch (err) {
    console.error('❌ Error while listening to Service Broker:', err);
  }
}

/**
 * Start WebSocket Server
 */
server.start()
  .then(async () => {
    console.log(`✅ WebSocket server is running at ws://localhost:${WS_PORT}${WS_PATH}`);

    try {
      await poolConnect;
      console.log('✅ Connected to SQL Server!');
    } catch (err) {
      console.error('❌ SQL Server connection failed:', err);
      process.exit(1);
    }

    // Handle new client connection
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

    // Start listening for DB change messages
    listenToServiceBrokerQueue();
  })
  .catch(err => {
    console.error('❌ Failed to start WebSocket server:', err);
    process.exit(1);
  });

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
