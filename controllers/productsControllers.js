import { getDBConnection } from "../db/db.js";

export async function getGenres(req, res) {
  try {
    const db = await getDBConnection();
    let genres;

    try {
      const rows = await db.all(
        "SELECT DISTINCT genre FROM products WHERE genre IS NOT NULL ORDER BY genre",
      );
      genres = rows.map((row) => row.genre);
    } finally {
      await db.close();
    }

    res.json(genres);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch genres", details: err.message });
  }
}

export async function getProducts() {
  console.log("products");
}
