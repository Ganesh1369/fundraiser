const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'fundraiser_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2211',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
});

// Test connection on startup
pool.getConnection()
    .then(conn => {
        console.log('Connected to MariaDB database');
        conn.release();
    })
    .catch(err => {
        console.error('Failed to connect to MariaDB:', err.message);
        process.exit(-1);
    });

// Helper function to execute queries — returns { rows, rowCount } for pg compat
const query = async (text, params) => {
    const start = Date.now();
    try {
        const [rows, fields] = await pool.execute(text, params);
        const duration = Date.now() - start;
        const rowCount = Array.isArray(rows) ? rows.length : rows.affectedRows;
        console.log('Executed query', { text: text.substring(0, 50), duration, rows: rowCount });
        return { rows, rowCount, fields };
    } catch (error) {
        console.error('Query error', { text: text.substring(0, 50), error: error.message });
        throw error;
    }
};

// Get a client (connection) from the pool for transactions
const getClient = async () => {
    const connection = await pool.getConnection();
    // Wrap connection.execute so it returns { rows, rowCount } like the pool wrapper
    const originalExecute = connection.execute.bind(connection);
    connection.query = async (text, params) => {
        const [rows, fields] = await originalExecute(text, params);
        const rowCount = Array.isArray(rows) ? rows.length : rows.affectedRows;
        return { rows, rowCount, fields };
    };
    return connection;
};

module.exports = {
    query,
    getClient,
    pool
};
