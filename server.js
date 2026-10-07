import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 8000;

/*
Challenge:
    1. Use express.static() to serve all the files in 'public'.
*/

app
  .listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  })
  .on("error", (err) => {
    console.error("Failed to start server:", err);
  });
