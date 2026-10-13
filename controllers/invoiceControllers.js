import { getDBConnection } from "../db/db.js";

export async function getInvoices(req, res) {
  let db;

  try {
    db = await getDBConnection();
    const invoices = await db.all(
      `SELECT
         orders.order_id AS orderId,
         orders.status,
         orders.total_usd AS totalUsd,
         orders.gross_amount_idr AS amountIdr,
         orders.created_at AS createdAt,
         COUNT(order_items.id) AS itemCount
       FROM orders
       LEFT JOIN order_items ON order_items.order_id = orders.order_id
       WHERE orders.user_id = ?
       GROUP BY orders.id
       ORDER BY orders.created_at DESC, orders.id DESC`,
      req.session.userId,
    );

    return res.json({ invoices });
  } catch (err) {
    console.error("Get invoices error:", err);
    return res.status(500).json({ error: "Failed to get invoices." });
  } finally {
    if (db) {
      await db.close();
    }
  }
}

export async function getInvoice(req, res) {
  let db;

  try {
    db = await getDBConnection();
    const invoice = await db.get(
      `SELECT
         order_id AS orderId,
         status,
         total_usd AS totalUsd,
         gross_amount_idr AS amountIdr,
         usd_idr_rate AS usdIdrRate,
         created_at AS createdAt,
         updated_at AS updatedAt
       FROM orders
       WHERE order_id = ? AND user_id = ?`,
      req.params.orderId,
      req.session.userId,
    );

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    invoice.items = await db.all(
      `SELECT
         title,
         artist,
         quantity,
         unit_price_usd AS unitPriceUsd,
         unit_price_idr AS unitPriceIdr
       FROM order_items
       WHERE order_id = ?
       ORDER BY id`,
      invoice.orderId,
    );

    return res.json({ invoice });
  } catch (err) {
    console.error("Get invoice error:", err);
    return res.status(500).json({ error: "Failed to get invoice." });
  } finally {
    if (db) {
      await db.close();
    }
  }
}
