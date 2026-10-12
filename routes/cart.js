import express from "express";
import {
  addToCart,
  deleteAll,
  deleteItem,
  getAll,
  getCartCount,
} from "../controllers/cartControllers.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const cartRouter = express.Router();
cartRouter.use(requireAuth);
cartRouter.post("/add", addToCart);
cartRouter.get("/cart-count", getCartCount);
cartRouter.get("/", getAll);
cartRouter.delete("/all", deleteAll);
cartRouter.delete("/:itemId", deleteItem);
