import { getDBConnection } from "../db/db.js";

export async function addToCart(req, res) {
  const userId = req.session?.userId;
  const productId = Number(req.body?.productId);

  if (!userId) {
    return res.status(401).json({ error: "You must be logged in." });
  }

  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "A valid productId is required." });
  }

  let db;
  try {
    db = await getDBConnection();

    const existingItem = await db.get(
      "SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?",
      userId,
      productId,
    );

    if (existingItem) {
      await db.run(
        "UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?",
        existingItem.id,
      );
    } else {
      await db.run(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)",
        userId,
        productId,
      );
    }

    return res.json({ message: "Added to cart" });
  } catch (err) {
    console.error("Add to cart error:", err);
    return res.status(500).json({ error: "Failed to add product to cart." });
  } finally {
    if (db) {
      await db.close();
    }
  }
}

export async function getCartCount(req, res) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.json({ totalItems: 0 });
  }

  let db;

  try {
    db = await getDBConnection();

    const result = await db.get(
      "SELECT COALESCE(SUM(quantity), 0) AS totalItems FROM cart_items WHERE user_id = ?",
      userId,
    );

    return res.json({ totalItems: Number(result?.totalItems ?? 0) });
  } catch (err) {
    console.error("Get cart count error:", err);
    return res.status(500).json({ error: "Failed to get cart count." });
  } finally {
    if (db) {
      await db.close();
    }
  }
}

export async function getAll(req, res) {
  if (!req.session.userId) {
    return res.json({ err: "not logged in" });
  }

  const db = await getDBConnection();

  try {
    const items = await db.all(
      `SELECT
        cart_items.id AS cartItemId,
        cart_items.quantity,
        products.title,
        products.artist,
        products.price
      FROM cart_items
      JOIN products ON products.id = cart_items.product_id
      WHERE cart_items.user_id = ?`,
      req.session.userId,
    );

    return res.json({ items });
  } catch (err) {
    console.error("Get cart error:", err);
    return res.status(500).json({ error: "Failed to get cart items." });
  } finally {
    await db.close();
  }
}
