import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";

async function dropTable() {
  const db = await open({
    filename: path.join("database.db"),
    driver: sqlite3.Database,
  });

  await db.exec(`
            DROP TABLE IF EXISTS cart_items;
            `);

  await db.close();
  console.log("table dropped");
}

dropTable();
