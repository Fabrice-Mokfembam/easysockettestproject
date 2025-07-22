import sql from 'mssql';

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

async function testConnection() {
  try {
    const pool = await sql.connect(config);
    console.log('✅ Connection Successful!');
    await pool.close();
  } catch (err) {
    console.error('❌ Connection Failed:', err);
  }
}

testConnection();
