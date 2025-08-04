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
  getVendorById,
  updateVendor
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
router.get("/get-vendor-by-id/:id", getVendorById);
router.put("/update-vendor/:id", updateVendor);

export default router;
