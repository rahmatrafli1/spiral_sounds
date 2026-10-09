import express from "express";
import session from "express-session";
import "dotenv/config";
import { productsRouter } from "./routes/products.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";

const app = express();
const PORT = process.env.PORT || 8000;
const secret = process.env.SPIRAL_SESSION_SECRET;

app.use(express.json());

app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  }),
);

app.use(express.static("public"));
app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);
app.use("/api/auth/me", meRouter);

app
  .listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  })
  .on("error", (err) => {
    console.error("Failed to start server:", err);
  });
