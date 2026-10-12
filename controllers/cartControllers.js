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
