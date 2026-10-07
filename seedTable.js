import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import { vinyl } from "./data.js";

async function seedTable() {
  const db = await open({
    filename: path.join("database.db"),
    driver: sqlite3.Database,
  });

  try {
    await db.exec("BEGIN TRANSACTION");

    for (const record of vinyl) {
      await db.run(
        `INSERT INTO products (title, artist, price, image, year, genre, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.title,
          record.artist,
          record.price,
          record.image,
          record.year,
          record.genre,
          record.stock,
        ],
      );
    }

    await db.exec("COMMIT");
    console.log("All records inserted successfully.");
  } catch (err) {
    try {
      await db.exec("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error rolling back transaction:", rollbackError.message);
    }
    console.error("Error inserting data:", err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
    console.log("Database connection closed.");
  }
}

seedTable();
