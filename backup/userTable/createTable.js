import { getDBConnection } from '../db/db.js'

async function createTable() {
  const db = await getDBConnection()

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
  } finally {
    await db.close()
  }

  console.log('table created')
}

createTable()