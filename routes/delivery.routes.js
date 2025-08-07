import { Router } from "express";
import {
  getDeliveryPartnerSchedules,
  getScheduleByIdDeliveryPartner,
  updateScheduleStatusDeliveryPartner,
  getTodaySchedulesDeliveryPartner,
  getDeliveryPartnerDashboardStats,
} from "../controller/delivery.order.controller.js";
import {
  getDeliveryNotifications,
  getTodayMealSchedulesForDeliveryPartner,
} from "../controller/delivery.controller.js";

const router = Router();

// Delivery partner schedule management
router.get("/schedules", getDeliveryPartnerSchedules);
router.get("/schedules/today", getTodaySchedulesDeliveryPartner);
router.get("/schedules/:scheduleId", getScheduleByIdDeliveryPartner);
router.patch(
  "/schedules/:scheduleId/status",
  updateScheduleStatusDeliveryPartner
);

// Dashboard statistics
router.get("/dashboard-stats", getDeliveryPartnerDashboardStats);

// Legacy route (can be removed later)
router.get("/", (req, res) => {
  res.json({ message: "Delivery list" });
});

// router.get("/get-delivery-notifications", getDeliveryNotifications);
// router.get("/get-scheduled-meals", getTodayMealSchedulesForDeliveryPartner);

export default router;
