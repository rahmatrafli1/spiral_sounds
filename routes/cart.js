import express from "express";
import {
  addToCart,
  deleteItem,
  getAll,
  getCartCount,
} from "../controllers/cartControllers.js";

export const cartRouter = express.Router();
cartRouter.post("/add", addToCart);
cartRouter.get("/cart-count", getCartCount);
cartRouter.get("/", getAll);
cartRouter.delete("/:itemId", deleteItem);
