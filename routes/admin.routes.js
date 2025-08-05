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
  softDeleteUser,
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
  verifyMeal,
  upsertSettings,
  toggleSoftDeleteVendor,
  hardDeleteVendor,
  toggleSoftDeleteDeliveryPartner,
  hardDeleteDeliveryPartner,

} from "../controller/admin.controller.js";

// Define admin routes here

// Banner CRUD routes
router.post(
  "/add-banner",
  getMulterUpload("banners").single("image"),
  addbanner
);
router.get("/banners", getBanners); // Get all banners
router.get("/banners/:id", getBannerById); // Get banner by ID
router.put(
  "/banners/:id",
  getMulterUpload("banners").single("image"),
  updateBanner
); // Update banner
router.delete("/banners/:id", deleteBanner); // Delete banner

//----------User---------//
router.get("/get-all-users", getAllUsers);
router.get("/get-user-by-id/:id", getUserById);
router.delete("/delete-user/:id", deleteUser);
router.delete("/soft-delete-user/:id", softDeleteUser);

//----------Vendor---------//
router.get("/get-all-vendors", getAllVendors);
router.get("/get-pending-vendors", getAllVendorsWithPendingStatus);
router.get("/get-vendor-by-id/:id", getVendorById);
router.put("/update-vendor/:id", updateVendor);
router.patch("/update-vendor-status/:id", updateVendorStatus);
router.get("/get-vendor-meals/:id", getMealsByVendorId);
router.patch("/verify-vendor-meal/:id", verifyMeal);
router.patch("/soft-delete-vendor/:id", toggleSoftDeleteVendor);
router.delete("/hard-delete-vendor/:id", hardDeleteVendor);

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

export default router;
