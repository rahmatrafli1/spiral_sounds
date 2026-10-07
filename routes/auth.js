import { registerUser } from "../controllers/authControllers.js";
import express from "express";

export const authRouter = express.Router();

authRouter.post("/register", registerUser);
