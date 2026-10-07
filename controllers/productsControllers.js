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

export async function getProducts(req, res) {
  try {
    const db = await getDBConnection();
    let products;

    try {
      const { genre, search } = req.query;
      let query = "SELECT * FROM products";
      const params = [];

      if (genre) {
        query += " WHERE genre = ?";
        params.push(genre);
      }

      if (search) {
        query += genre
          ? " AND (title LIKE ? OR artist LIKE ? OR genre LIKE ?)"
          : " WHERE title LIKE ? OR artist LIKE ? OR genre LIKE ?";
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      products = await db.all(query, params);
    } finally {
      await db.close();
    }

    res.json(products);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch products", details: err.message });
  }
}
