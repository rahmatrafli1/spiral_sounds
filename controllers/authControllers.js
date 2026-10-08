import validator from "validator";

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
    return res
      .status(400)
      .json({
        error:
          "Username must be 1–20 characters, using letters, numbers, _ or -.",
      });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  return res.status(200).json({ message: "User data is valid." });
}
