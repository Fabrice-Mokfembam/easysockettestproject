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


let lastChangeTrackingVersion = 0;

/**
 * Asynchronously fetches the current Change Tracking version from the SQL Server.
 * This is a lightweight query to check if any changes have occurred in the database.
 * @returns {Promise<number>} The current Change Tracking version, or -1 if an error occurs.
 */
async function getChangeTrackingCurrentVersion() {
  try {
   
    await poolConnect;
    const request = pool.request();
  
    const result = await request.query(`SELECT CHANGE_TRACKING_CURRENT_VERSION() AS CurrentVersion`);
    return result.recordset[0].CurrentVersion;
  } catch (err) {
    console.error('Error fetching Change Tracking current version:', err);
    return -1;
  }
}

/**
 * Asynchronously fetches all employee data from the 'employees' table.
 * This function is called when a client connects or when a database change is detected.
 * @returns {Promise<Array<Object>>} An array of employee objects, or an empty array if an error occurs.
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


const WS_PORT = 8087;
const WS_PATH = '/websocket';
const server = new MyWebSocketServer(WS_PORT, WS_PATH);

server.start()
  .then(async () => {
  
    console.log(`WebSocket server is running on ws://localhost:${WS_PORT}${WS_PATH}`);
    
    try {

      await poolConnect;
  
      console.log('✅ Successfully connected to SQL Server!');
      
      lastChangeTrackingVersion = await getChangeTrackingCurrentVersion();
      console.log(`Initial Change Tracking Version: ${lastChangeTrackingVersion}`);

    } catch (err) {
      console.error('❌ Failed to connect to SQL Server:', err);
    
      process.exit(1);
    }

    server.onClientConnect(async (client) => {
      console.log('New client connected. Broadcasting initial employee data.');

      const employeeData = await fetchEmployeeData();
      server.sendMessage(client, {
        type: 'employeeDataUpdate',
        content: employeeData, 
        serverTime: new Date().toLocaleTimeString(),
        clientsOnline: server.getConnectedClientCount() 
      });
    });

  })
  .catch(err => {

    console.error('Failed to start WebSocket server:', err);
    process.exit(1);
  });

setInterval(async () => { 

  if (server.getConnectedClientCount() > 0) {

    const currentVersion = await getChangeTrackingCurrentVersion();
    if (currentVersion > lastChangeTrackingVersion) {
      console.log(`Change detected! Old Version: ${lastChangeTrackingVersion}, New Version: ${currentVersion}`);
      const employeeData = await fetchEmployeeData(); 

      server.broadcastMessage({
        type: 'employeeDataUpdate',
        content: employeeData,
        serverTime: new Date().toLocaleTimeString(),
        clientsOnline: server.getConnectedClientCount() 
      });
      console.log(`Broadcasted updated employee data to ${server.getConnectedClientCount()} clients.`);
     
      lastChangeTrackingVersion = currentVersion; 
    } else if (currentVersion === -1) {
        console.error("Skipping change check due to an error fetching current CT version.");
    } else {
      
        console.log("No change detected in employee data.");
    }
  }
}, 5000); 

/**
 * Asynchronously handles the graceful shutdown of the server.
 * This includes stopping the WebSocket server and closing the SQL Server connection pool.
 */
async function shutdown() {
  console.log('Shutting down server and closing DB connection...');

  await server.stop();
  
  try {
 
    await pool.close();
    console.log('SQL Server connection closed');
  } catch (err) {
    console.error('Error closing SQL Server connection:', err);
  }
  

  process.exit(0);
}


process.on('SIGINT', shutdown);