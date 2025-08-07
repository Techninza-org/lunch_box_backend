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
  getMealsByDeliveryPartner,
  updateDeliveryPartnerProfile
} from "../controller/delivery.controller.js";

import { getMulterUpload } from "../utils/multer.js";
const deliveryPartner = getMulterUpload("delivery-partners");

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

router.get("/get-delivery-notifications", getDeliveryNotifications);
router.get("/get-order-history", getMealsByDeliveryPartner);
router.put("/update-delivery-profile", deliveryPartner.any(), updateDeliveryPartnerProfile);

export default router;
