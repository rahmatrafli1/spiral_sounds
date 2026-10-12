export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    console.log("Access blocked: user is not authenticated.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}
