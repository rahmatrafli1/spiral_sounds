import express from "express";
import { getProducts, getGenres } from "../controllers/productsControllers.js";

const productsRouter = express.Router();

productsRouter.get("/", getProducts);
productsRouter.get("/genres", getGenres);

export { productsRouter };
