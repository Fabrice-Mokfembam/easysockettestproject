import { Sequelize } from 'sequelize';
import MyWebSocketServer from '@mokfembam/easysocket-server';

const sequelize = new Sequelize('workers', 'root', 'root1234', {
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  logging: false
});

async function fetchEmployeeData() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(
      'SELECT employee_id AS WorkerID, first_name AS FirstName, last_name AS LastName, department AS Department, salary AS Salary FROM employees'
    );
    return results;
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
      await sequelize.authenticate();
      console.log('Successfully connected to MySQL using Sequelize for server startup!');
    } catch (err) {
      console.error('Failed to connect to MySQL during server startup:', err);
    }
  })
  .catch(err => {
    console.error('Failed to start WebSocket server:', err);
    process.exit(1);
  });



setInterval(async () => { 
  if (server.getConnectedClientCount() > 0) {
    const employeeData = await fetchEmployeeData(); 
    server.broadcastMessage({
      type: 'employeeDataUpdate', 
      content: employeeData,
      serverTime: new Date().toLocaleTimeString(),
      clientsOnline: server.getConnectedClientCount()
    });
    console.log(`Broadcasted employee data and server update to ${server.getConnectedClientCount()} clients.`);
  }
}, 10000); 

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down server and closing DB connection...');
  await server.stop();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down server and closing DB connection...');
  await server.stop();
  await sequelize.close();
  process.exit(0);
});