import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDBConnection } from "../db/db.js";

const midtransConfig = () => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const usdIdrRate = Number(process.env.SPIRAL_USD_IDR_RATE);

  if (!serverKey || !clientKey) {
    throw new Error("Midtrans server and client keys must be configured.");
  }

  if (!Number.isFinite(usdIdrRate) || usdIdrRate <= 0) {
    throw new Error("SPIRAL_USD_IDR_RATE must be a positive number.");
  }

  return {
    serverKey,
    clientKey,
    usdIdrRate,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  };
};

const midtransTransactionUrl = (isProduction) =>
  isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export function getPaymentConfig(req, res) {
  try {
    const { clientKey, isProduction } = midtransConfig();
    return res.json({ clientKey, isProduction });
  } catch (err) {
    console.error("Payment configuration error:", err.message);
    return res.status(503).json({
      error: "Online payments are not configured yet.",
    });
  }
}

export async function createPayment(req, res) {
  let db;
  let orderId;

  try {
    const config = midtransConfig();
    db = await getDBConnection();

    const [user, items] = await Promise.all([
      db.get(
        "SELECT name, email FROM users WHERE id = ?",
        req.session.userId,
      ),
      db.all(
        `SELECT products.id AS productId, products.title, products.artist,
                products.price, cart_items.quantity
         FROM cart_items
         JOIN products ON products.id = cart_items.product_id
         WHERE cart_items.user_id = ?`,
        req.session.userId,
      ),
    ]);

    if (!user) {
      return res.status(401).json({ error: "Please log in again." });
    }

    if (items.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const orderItems = items.map((item) => {
      const unitPriceUsd = Number(item.price);
      const unitPriceIdr = Math.round(unitPriceUsd * config.usdIdrRate);

      if (
        !Number.isFinite(unitPriceUsd) ||
        unitPriceUsd <= 0 ||
        !Number.isSafeInteger(unitPriceIdr) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error("The cart contains an invalid product price or quantity.");
      }

      return { ...item, unitPriceUsd, unitPriceIdr };
    });

    const grossAmountIdr = orderItems.reduce(
      (total, item) => total + item.unitPriceIdr * item.quantity,
      0,
    );
    const totalUsd = orderItems.reduce(
      (total, item) => total + item.unitPriceUsd * item.quantity,
      0,
    );

    if (!Number.isSafeInteger(grossAmountIdr) || grossAmountIdr <= 0) {
      return res.status(400).json({ error: "The order amount is invalid." });
    }

    orderId = `spiral-${req.session.userId}-${Date.now()}-${randomBytes(4).toString("hex")}`;

    await db.exec("BEGIN IMMEDIATE");
    try {
      await db.run(
        `INSERT INTO orders
           (order_id, user_id, total_usd, gross_amount_idr, usd_idr_rate, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        orderId,
        req.session.userId,
        totalUsd,
        grossAmountIdr,
        config.usdIdrRate,
      );

      for (const item of orderItems) {
        await db.run(
          `INSERT INTO order_items
             (order_id, product_id, title, artist, quantity, unit_price_usd, unit_price_idr)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          orderId,
          item.productId,
          item.title,
          item.artist,
          item.quantity,
          item.unitPriceUsd,
          item.unitPriceIdr,
        );
      }
      await db.exec("COMMIT");
    } catch (err) {
      await db.exec("ROLLBACK");
      throw err;
    }

    let gatewayResponse;
    try {
      const response = await fetch(
        midtransTransactionUrl(config.isProduction),
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: orderId,
              gross_amount: grossAmountIdr,
            },
            item_details: orderItems.map((item) => ({
              id: String(item.productId),
              price: item.unitPriceIdr,
              quantity: item.quantity,
              name: `${item.title} - ${item.artist}`.slice(0, 50),
            })),
            customer_details: {
              first_name: user.name || user.email,
              email: user.email,
            },
          }),
        },
      );
      gatewayResponse = await response.json();

      if (!response.ok || typeof gatewayResponse.token !== "string") {
        console.error("Midtrans transaction creation failed:", gatewayResponse);
        await db.run(
          "UPDATE orders SET status = 'failed' WHERE order_id = ?",
          orderId,
        );
        return res.status(502).json({
          error: "Midtrans could not start the payment. Please try again.",
        });
      }
    } catch (err) {
      console.error("Midtrans request error:", err);
      await db.run(
        "UPDATE orders SET status = 'failed' WHERE order_id = ?",
        orderId,
      );
      return res.status(502).json({
        error: "Could not connect to Midtrans. Please try again.",
      });
    }

    await db.exec("BEGIN IMMEDIATE");
    try {
      await db.run(
        "UPDATE orders SET snap_token = ? WHERE order_id = ?",
        gatewayResponse.token,
        orderId,
      );
      await db.run("DELETE FROM cart_items WHERE user_id = ?", req.session.userId);
      await db.exec("COMMIT");
    } catch (err) {
      await db.exec("ROLLBACK");
      throw err;
    }

    return res.status(201).json({
      orderId,
      token: gatewayResponse.token,
      amountIdr: grossAmountIdr,
      amountUsd: totalUsd,
    });
  } catch (err) {
    console.error("Create payment error:", err);
    if (db && orderId) {
      await db.run(
        "UPDATE orders SET status = 'failed' WHERE order_id = ? AND status = 'pending'",
        orderId,
      );
    }
    return res.status(500).json({ error: "Failed to create the payment." });
  } finally {
    if (db) {
      await db.close();
    }
  }
}

export async function getOrderStatus(req, res) {
  let db;

  try {
    db = await getDBConnection();
    const order = await db.get(
      `SELECT order_id AS orderId, status, gross_amount_idr AS amountIdr
       FROM orders
       WHERE order_id = ? AND user_id = ?`,
      req.params.orderId,
      req.session.userId,
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    return res.json(order);
  } catch (err) {
    console.error("Get order status error:", err);
    return res.status(500).json({ error: "Failed to get order status." });
  } finally {
    if (db) {
      await db.close();
    }
  }
}

export async function handleMidtransNotification(req, res) {
  let db;

  try {
    const { serverKey } = midtransConfig();
    const {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
    } = req.body ?? {};

    console.log("Midtrans notification received:", {
      orderId,
      statusCode,
      grossAmount,
      transactionStatus,
      fraudStatus,
    });

    if (
      typeof orderId !== "string" ||
      typeof statusCode !== "string" ||
      typeof grossAmount !== "string" ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({ error: "Invalid payment notification." });
    }

    const expectedSignature = createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex");
    const received = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return res.status(403).json({ error: "Invalid notification signature." });
    }

    console.log("Midtrans notification signature verified for order:", orderId);

    const isPaid =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");
    const isExpired = transactionStatus === "expire";
    const isFailed = ["deny", "cancel"].includes(transactionStatus);

    db = await getDBConnection();
    await db.exec("BEGIN IMMEDIATE");
    try {
      const order = await db.get(
        "SELECT user_id, gross_amount_idr, status FROM orders WHERE order_id = ?",
        orderId,
      );

      if (!order) {
        await db.exec("ROLLBACK");
        console.error("Midtrans notification references unknown order:", orderId);
        return res.status(404).json({ error: "Order not found." });
      }

      console.log("Midtrans order matched notification:", {
        orderId,
        orderStatus: order.status,
        expectedAmount: order.gross_amount_idr,
        receivedAmount: grossAmount,
      });

      if (Number(grossAmount) !== order.gross_amount_idr) {
        await db.exec("ROLLBACK");
        console.error("Midtrans notification amount mismatch:", {
          orderId,
          receivedAmount: grossAmount,
          expectedAmount: order.gross_amount_idr,
        });
        return res.status(400).json({ error: "Payment amount does not match order." });
      }

      let resultingStatus = order.status;
      if (order.status !== "paid" && isPaid) {
        await db.run(
          "UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
          orderId,
        );
        resultingStatus = "paid";
      } else if (order.status === "pending" && isExpired) {
        await db.run(
          "UPDATE orders SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
          orderId,
        );
        resultingStatus = "expired";
      } else if (order.status === "pending" && isFailed) {
        await db.run(
          "UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
          orderId,
        );
        resultingStatus = "failed";
      }

      await db.exec("COMMIT");
      console.log("Midtrans notification processed:", {
        orderId,
        transactionStatus,
        previousStatus: order.status,
        resultingStatus,
      });
    } catch (err) {
      await db.exec("ROLLBACK");
      throw err;
    }

    return res.status(200).json({ message: "Notification processed." });
  } catch (err) {
    console.error("Midtrans notification error:", err);
    return res.status(500).json({ error: "Failed to process notification." });
  } finally {
    if (db) {
      await db.close();
    }
  }
}
