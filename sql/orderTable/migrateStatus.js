import { getDBConnection } from "../../db/db.js";

async function migrateOrderStatus() {
  const db = await getDBConnection();

  try {
    const table = await db.get(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'",
    );

    if (!table) {
      throw new Error("Orders table does not exist; run createTable.js first.");
    }

    if (table.sql.includes("'expired'")) {
      console.log("Orders status constraint already supports expired.");
      return;
    }

    await db.exec("PRAGMA foreign_keys = OFF; BEGIN TRANSACTION;");
    try {
      await db.exec(`
        CREATE TABLE orders_rebuilt (
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
        INSERT INTO orders_rebuilt
          (id, order_id, user_id, total_usd, gross_amount_idr, usd_idr_rate, status, snap_token, created_at, updated_at)
        SELECT id, order_id, user_id, total_usd, gross_amount_idr, usd_idr_rate, status, snap_token, created_at, updated_at
        FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_rebuilt RENAME TO orders;
        CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
      `);
      await db.exec("COMMIT;");
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    } finally {
      await db.exec("PRAGMA foreign_keys = ON;");
    }

    console.log("Orders status constraint migrated successfully.");
  } finally {
    await db.close();
  }
}

migrateOrderStatus().catch((err) => {
  console.error("Error migrating order status:", err);
  process.exitCode = 1;
});
