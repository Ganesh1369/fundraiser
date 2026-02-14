const mysql = require('mysql2/promise');

const isDev = (process.env.NODE_ENV || 'development') === 'development';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'fundraiser_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 50,
    queueLimit: 100,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
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
    try {
        const [rows, fields] = await pool.query(text, params);
        const rowCount = Array.isArray(rows) ? rows.length : rows.affectedRows;
        // if (isDev) console.log('Query', { sql: text.substring(0, 60), rows: rowCount });
        return { rows, rowCount, fields };
    } catch (error) {
        console.error('Query error', { sql: text.substring(0, 60), error: error.message });
        throw error;
    }
};

// Get a client (connection) from the pool for transactions
const getClient = async () => {
    const connection = await pool.getConnection();
    const originalQuery = connection.query.bind(connection);
    connection.query = async (text, params) => {
        const [rows, fields] = await originalQuery(text, params);
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
