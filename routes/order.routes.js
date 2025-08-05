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
  assignDeliveryPartner,
} from "../controller/order.controller.js";

const router = express.Router();

// User order routes
router.post("/", userAuth, createOrder);
router.get("/", userAuth, getUserOrders);
router.get("/schedules", userAuth, getUserMealSchedules);
router.get("/schedules/today", getTodayMealSchedules);
router.get("/:orderId", userAuth, getOrderById);
router.patch("/:orderId/cancel", userAuth, cancelOrder);

// Schedule management routes
router.patch("/schedules/:scheduleId/status", updateMealScheduleStatus);
router.patch(
  "/schedules/:scheduleId/assign-delivery-partner",
  assignDeliveryPartner
);

export default router;
