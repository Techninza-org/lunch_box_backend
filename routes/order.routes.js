import express from "express";
import { userAuth } from "../middlewares/auth.js";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getTodayMealSchedules,
  updateMealScheduleStatus,
  getUserMealSchedules,
} from "../controller/order.controller.js";

const router = express.Router();

// User order routes
router.post("/", userAuth, createOrder);
router.get("/", userAuth, getUserOrders);
router.get("/schedules", userAuth, getUserMealSchedules);
router.get("/schedules/today", getTodayMealSchedules); // For cron job - no auth needed
router.get("/:orderId", userAuth, getOrderById);
router.patch("/:orderId/cancel", userAuth, cancelOrder);

// Schedule management routes
router.patch("/schedules/:scheduleId/status", updateMealScheduleStatus);

export default router;
