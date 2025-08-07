import { Router } from "express";
const router = Router();
import { getMulterUpload } from "../utils/multer.js";
import {
  addVendorMeal,
  getMealsByVendor,
  getMealByIdVendor,
  updateVendorMeal,
  updateStatusMealVendor,
  softDeleteMealVendor,
} from "../controller/meal.controller.js";
import {
  getVendorMealSchedules,
  bulkUpdateScheduleStatus,
  getVendorScheduleStats,
  assignDeliveryPartner,
} from "../controller/order.controller.js";
import {
  getVendorOrders,
  getVendorOrderById,
  updateVendorOrderStatus,
  getVendorDashboardStats,
} from "../controller/vendor.order.controller.js";
import {
  updateVendorProfile,
  updateVendorMealTimes,
  addOrUpdateVendorBankDetail,
  toggleVendorActive,
  getVendorProfile,
  getVendorNotifications,
  searchMeals
} from "../controller/vendor.controller.js";

const upload = getMulterUpload("meals");
const logoUpload = getMulterUpload("vendors");

// Meal management routes
router.post("/add-meal", upload.any(), addVendorMeal);
router.get("/get-meals", getMealsByVendor);
router.get("/get-meals/:id", getMealByIdVendor);
router.patch("/update-meal/:id", upload.any(), updateVendorMeal);
router.put("/update-status/:id", updateStatusMealVendor);
router.delete("/soft-delete/:id", softDeleteMealVendor);
router.get("/search-meals", searchMeals);

// Order management routes
router.get("/orders", getVendorOrders);
router.get("/orders/:orderId", getVendorOrderById);
router.patch("/orders/:orderId/status", updateVendorOrderStatus);

// Schedule management routes
router.get("/schedules", getVendorMealSchedules);
router.patch("/schedules/bulk-update", bulkUpdateScheduleStatus);
router.get("/schedule-stats", getVendorScheduleStats);
router.patch(
  "/schedules/:scheduleId/assign-delivery-partner",
  assignDeliveryPartner
);

// Vendor profile management
router.put("/update-vendor-profile", logoUpload.single("logo"), updateVendorProfile);
router.put("/update-vendor-meal-times", updateVendorMealTimes);
router.post("/update-vendor-bank-details", addOrUpdateVendorBankDetail);
router.patch("/toggle-vendor-active", toggleVendorActive);
router.get("/get-vendor-details", getVendorProfile);
router.get("/get-vendor-notifications", getVendorNotifications);


// Dashboard statistics
router.get("/dashboard-stats", getVendorDashboardStats);

export default router;
