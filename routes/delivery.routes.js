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
  updateDeliveryPartnerProfile,
  addOrUpdateDeliveryBankDetail
} from "../controller/delivery.controller.js";
import { 
  createSupportTicket,
  getSupportTickets,
  sendMessageToSupportTicket
} from "../controller/support.controller.js";
import { 
  createDeliveryWalletOrder,
  verifyDeliveryWalletPayment,
  getDeliveryWallet,
  createDeliveryDebitTransaction

} from "../controller/payment.controller.js";

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
router.post("/update-delivery-bank-details", addOrUpdateDeliveryBankDetail);

// Support ticket routes
router.post("/create-delivery-support-ticket", createSupportTicket);
router.get("/get-delivery-support-tickets", getSupportTickets);
router.post("/send-message-to-support-ticket-delivery/:ticketId", sendMessageToSupportTicket);

// Wallet routes
router.post("/create-delivery-wallet-order", createDeliveryWalletOrder);
router.post("/verify-delivery-wallet", verifyDeliveryWalletPayment);
router.get("/get-delivery-wallet", getDeliveryWallet);
router.post("/debit-delivery-wallet", createDeliveryDebitTransaction);



export default router;
