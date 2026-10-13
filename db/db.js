import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "node:url";

export async function getDBConnection() {
  const dbPath = fileURLToPath(new URL("../database.db", import.meta.url));

  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}
