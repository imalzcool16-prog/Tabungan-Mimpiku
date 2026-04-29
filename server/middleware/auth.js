const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "tabungan_mimpiku_secret_key_2024";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Akses ditolak. Token tidak ditemukan." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token tidak valid." });
  }
};

const generateToken = (userId, username) => {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "24h" });
};

module.exports = { authMiddleware, generateToken, JWT_SECRET };
