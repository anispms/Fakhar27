const { Client } = require('pg')

const ADMIN_DATABASE = process.env.ADMIN_DATABASE || 'admin_login_db'
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

const databaseConfig = {
  host: 'localhost',
  user: 'postgres',
  port: 5432,
  password: 'REDACTED_LOCAL_DEV_PASSWORD',
  database: 'postgres',
}

const adminClient = new Client({ ...databaseConfig, database: ADMIN_DATABASE })

async function initializeAdminDatabase() {
  const databaseClient = new Client(databaseConfig)
  await databaseClient.connect()

  try {
    const databaseResult = await databaseClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [ADMIN_DATABASE],
    )

    if (databaseResult.rows.length === 0) {
      const safeDatabaseName = ADMIN_DATABASE.replaceAll('"', '""')
      await databaseClient.query(`CREATE DATABASE "${safeDatabaseName}"`)
    }
  } finally {
    await databaseClient.end()
  }

  await adminClient.connect()
  await adminClient.query(`
    CREATE TABLE IF NOT EXISTS admin (
      email VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await adminClient.query(
    `INSERT INTO admin (email, password)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING`,
    [DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD],
  )
}

async function authenticateAdmin(email, password) {
  const result = await adminClient.query(
    `SELECT email FROM admin
     WHERE LOWER(email) = LOWER($1) AND password = $2`,
    [email.trim(), password],
  )

  return result.rows[0] || null
}

module.exports = {
  authenticateAdmin,
  initializeAdminDatabase,
}
