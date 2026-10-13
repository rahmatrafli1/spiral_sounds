import { getDBConnection } from "../../db/db.js";

async function createTable() {
  const db = await getDBConnection();

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        total_usd REAL NOT NULL,
        gross_amount_idr INTEGER NOT NULL,
        usd_idr_rate REAL NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
        snap_token TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price_usd REAL NOT NULL,
        unit_price_idr INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
      CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
    `);
    console.log("Orders tables created.");
  } finally {
    await db.close();
  }
}

createTable().catch((err) => {
  console.error("Error creating orders tables:", err);
  process.exitCode = 1;
});
