const jwt = require("jsonwebtoken");
const Auth = require("../model/Auth");
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Access token required" });
    }

    // Tách token từ "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Tìm user trong database theo userId (được set trong payload của token)
    const user = await Auth.findById(decoded.userId);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid token - user not found" });
    }

    // Gắn thông tin user vào request để route dùng
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else if (error.name === "NotBeforeError") {
      return res.status(401).json({ message: "Token not active" });
    }

    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = authMiddleware;
