import express from "express";
import { addToCart } from "../controllers/cartControllers.js";

export const cartRouter = express.Router();
cartRouter.post("/add", addToCart);
