import { Router } from "express";
const router = Router();
import { getMulterUpload } from "../utils/multer.js";
import {
  addbanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  getAllUsers,
  getUserById,
  deleteUser,
  toggleSoftDeleteUser,
  getAllVendors,
  getAllVendorsWithPendingStatus,
  getVendorById,
  updateVendor,
  updateVendorStatus,
  getAllDeliveryPartners,
  updateDeliveryPartner,
  getDeliveryPartnerById,
  getUnverifiedDeliveryPartners,
  verifyDeliveryPartner,
  unverifyDeliveryPartner,
  getMealsByVendorId,
  toggleVerifyMeal,
  upsertSettings,
  toggleSoftDeleteVendor,
  hardDeleteVendor,
  toggleSoftDeleteDeliveryPartner,
  hardDeleteDeliveryPartner,
  getAllMeals,
  getMealById,
  getAllMealsGroupedByVerification,
  toggleMealAvailability,
  getAllNotifications,
  sendCustomNotification,
  getAllSupportTicketsGroupedById,
  getAllAdmin,
  softdeleteAdmin,
  getAllScheduledOrders,
  getSettings,


} from "../controller/admin.controller.js";
import {
  getAllOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  assignDeliveryPartnerAdmin,
  getAdminDashboardStats,
} from "../controller/admin.order.controller.js";
import {
  sendMessageToSupportTicket,
  updateSupportTicketStatus
} from "../controller/support.controller.js";
import {
  createAdminWalletOrder,
  verifyAdminWalletPayment,
  getAdminWallet,
  createAdminDebitTransaction
} from "../controller/payment.controller.js";

// Define admin routes here

router.get('/scheduled-orders', getAllScheduledOrders)

router.get("/get-all-admins", getAllAdmin);
router.delete("/soft-delete-admin/:id", softdeleteAdmin);

// Banner CRUD routes
router.post(
  "/add-banner",
  getMulterUpload("banners").any(),
  addbanner
);
router.get("/banners", getBanners); // Get all banners
router.get("/banners/:id", getBannerById); // Get banner by ID
router.put(
  "/banners/:id",
  getMulterUpload("banners").any(),
  updateBanner
); // Update banner
router.delete("/banners/:id", deleteBanner); // Delete banner

//----------User---------//
router.get("/get-all-users", getAllUsers);
router.get("/get-user-by-id/:id", getUserById);
router.delete("/delete-user/:id", deleteUser);
router.patch("/soft-delete-user/:id", toggleSoftDeleteUser);

//----------Vendor---------//
router.get("/get-all-vendors", getAllVendors);
router.get("/get-pending-vendors", getAllVendorsWithPendingStatus);
router.get("/get-vendor-by-id/:id", getVendorById);
router.put("/update-vendor/:id", updateVendor);
router.patch("/update-vendor-status/:id", updateVendorStatus);

router.get("/get-vendor-meals/:id", getMealsByVendorId);
router.patch("/verify-vendor-meal/:id", toggleVerifyMeal);
router.patch("/soft-delete-vendor/:id", toggleSoftDeleteVendor);
router.delete("/hard-delete-vendor/:id", hardDeleteVendor);
router.get("/get-all-meals", getAllMeals);
router.get("/get-meal-by-id/:id", getMealById);
router.get("/get-all-meals-by-verification", getAllMealsGroupedByVerification);
router.patch("/toggle-meal-availability/:id", toggleMealAvailability);



//----------Delivery_Partner---------//
router.get("/get-all-delivery-partners", getAllDeliveryPartners);
router.get("/get-delivery-partner-by-id/:id", getDeliveryPartnerById);
router.put("/update-delivery-partner/:id", updateDeliveryPartner);
router.get("/get-unverified-partners", getUnverifiedDeliveryPartners);
router.patch("/verify-delivery-partner/:id", verifyDeliveryPartner);
router.patch("/unverify-delivery-partner/:id", unverifyDeliveryPartner);
router.patch("/soft-delete-delivery-partner/:id", toggleSoftDeleteDeliveryPartner);
router.delete("/hard-delete-delivery-partner/:id", hardDeleteDeliveryPartner);

//----------Settings---------//
router.post("/update-settings", upsertSettings);
router.get("/get-settings", getSettings);
router.get("/get-all-notifications", getAllNotifications);
router.post("/send-notification", sendCustomNotification);


//----------Orders Management---------//
router.get("/orders", getAllOrdersAdmin);
router.get("/orders/:orderId", getOrderByIdAdmin);
router.patch("/orders/:orderId/status", updateOrderStatusAdmin);
router.patch("/orders/:orderId/assign-delivery-partner",
  assignDeliveryPartnerAdmin
);
router.get("/dashboard-stats", getAdminDashboardStats);

//----------Support Ticket Management---------//

router.get("/get-all-support-tickets", getAllSupportTicketsGroupedById);
router.post("/send-message-to-support-ticket-admin/:ticketId", sendMessageToSupportTicket);
router.patch("/update-support-ticket-status/:ticketId", updateSupportTicketStatus);

// Wallet routes

router.post("/create-admin-wallet-order", createAdminWalletOrder);
router.post("/verify-admin-wallet", verifyAdminWalletPayment);
router.get("/get-admin-wallet", getAdminWallet);
router.post("/debit-admin-wallet", createAdminDebitTransaction);



export default router;
