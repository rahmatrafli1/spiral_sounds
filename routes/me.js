import express from "express";
import { getCurrentUser } from "../controllers/meControllers.js";

export const meRouter = express.Router();

meRouter.get("/", getCurrentUser);
