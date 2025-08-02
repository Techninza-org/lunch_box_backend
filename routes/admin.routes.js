import { Router } from "express";
const router = Router();
import { getMulterUpload } from "../utils/multer.js";
import {
  addbanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
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

export default router;
