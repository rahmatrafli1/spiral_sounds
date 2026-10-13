import express from "express";
import { getInvoice, getInvoices } from "../controllers/invoiceControllers.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const invoicesRouter = express.Router();
invoicesRouter.use(requireAuth);
invoicesRouter.get("/", getInvoices);
invoicesRouter.get("/:orderId", getInvoice);
