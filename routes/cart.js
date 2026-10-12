import express from "express";
import { addToCart, getCartCount } from "../controllers/cartControllers.js";

export const cartRouter = express.Router();
cartRouter.post("/add", addToCart);
cartRouter.get("/cart-count", getCartCount);
