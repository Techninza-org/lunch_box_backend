import jwt from "jsonwebtoken";
import env from "dotenv";
env.config();
const JWT_SECRET = process.env.JWT_SECRET;

// 🔐 Base JWT verification
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  console.log("Auth Header:", authHeader);

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("No token provided");
  }
  const token = authHeader.split(" ")[1];
  console.log("Token:", token);
  const payload = jwt.verify(token, JWT_SECRET);
  console.log("Decoded Payload:", payload);

  return payload;
};

// 🛡️ Admin middleware
export const adminAuth = (req, res, next) => {
  try {
    const payload = verifyToken(req);
    if (payload.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admins only" });
    }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: err.message || "Unauthorized" });
  }
};

// 🧑‍💼 Vendor middleware

export const vendorAuth = (req, res, next) => {
  try {
    const payload = verifyToken(req);
    if (payload.role !== "VENDOR") {
      return res.status(403).json({ success: false, message: "Vendors only" });
    }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: err.message || "Unauthorized" });
  }
};

// 👤 User middleware
export const userAuth = (req, res, next) => {
  try {
    const payload = verifyToken(req);
    if (payload.role !== "USER") {
      return res.status(403).json({ success: false, message: "Users only" });
    }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: err.message || "Unauthorized" });
  }
};
// 🚚 Delivery middleware
export const deliveryAuth = (req, res, next) => {
  try {
    const payload = verifyToken(req);
    if (payload.role !== "DELIVERY") {
      return res
        .status(403)
        .json({ success: false, message: "Delivery personnel only" });
    }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: err.message || "Unauthorized" });
  }
};
