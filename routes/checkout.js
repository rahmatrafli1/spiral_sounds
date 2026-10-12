import express from "express";
import {
  createPayment,
  getOrderStatus,
  getPaymentConfig,
  handleMidtransNotification,
} from "../controllers/paymentControllers.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const checkoutRouter = express.Router();

checkoutRouter.post("/notification", handleMidtransNotification);
checkoutRouter.get("/config", requireAuth, getPaymentConfig);
checkoutRouter.post("/", requireAuth, createPayment);
checkoutRouter.get("/:orderId", requireAuth, getOrderStatus);
