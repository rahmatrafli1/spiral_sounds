import bcrypt from "bcryptjs";
import validator from "validator";
import { getDBConnection } from "../db/db.js";

export async function registerUser(req, res) {
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || !username || !password.trim()) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (!/^[a-zA-Z0-9_-]{1,20}$/.test(username)) {
    return res.status(400).json({
      error:
        "Username must be 1–20 characters, using letters, numbers, _ or -.",
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  try {
    const db = await getDBConnection();
    let statusCode = 201;
    let responseBody = { message: "User registered" };

    const existingUser = await db.get(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      email,
      username,
    );

    if (existingUser) {
      statusCode = 400;
      responseBody = { error: "Email or username already in use." };
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.run(
        "INSERT INTO users (name, email, username, password) VALUES (?, ?, ?, ?)",
        name,
        email,
        username,
        hashedPassword,
      );
      req.session.userId = result.lastID;
    }

    return res.status(statusCode).json(responseBody);
  } catch (err) {
    console.error("Registration error:", err.message);
    return res
      .status(500)
      .json({ error: "Registration failed. Please try again." });
  }
}
