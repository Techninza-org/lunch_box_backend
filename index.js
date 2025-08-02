import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Middlewares
import errorHandler from "./middlewares/errorHandler.js";
import {
  adminAuth,
  vendorAuth,
  userAuth,
  deliveryAuth,
} from "./middlewares/auth.js";

// Routes
import userRoutes from "./routes/user.routes.js";
import publicRoutes from "./routes/public.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import path from "path";

dotenv.config();

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/", (req, res) => {
  res.status(200).send("Hello from Lunch Box Backend!");
});
// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// API Routes
app.use("/api/public", publicRoutes); // auth and public routes
app.use("/api/users", userAuth, userRoutes); // user authenticated routes
app.use("/api/admin", adminAuth, adminRoutes); // admin authenticated routes
app.use("/api/vendor", vendorAuth, vendorRoutes); // vendor authenticated routes
app.use("/api/delivery", deliveryAuth, deliveryRoutes); // delivery authenticated routes

// 404 Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    path: req.originalUrl,
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
