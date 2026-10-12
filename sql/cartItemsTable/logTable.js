import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";

async function viewAllCartItems() {
  const db = await open({
    filename: path.join("database.db"),
    driver: sqlite3.Database,
  });

  try {
    const cart_items = await db.all("SELECT * FROM cart_items");
    console.table(cart_items);
  } catch (err) {
    console.error("Error fetching cart_items:", err.message);
  } finally {
    await db.close();
  }
}

viewAllCartItems();
