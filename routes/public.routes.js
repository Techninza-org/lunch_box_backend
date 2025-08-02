import { Router } from "express";
const router = Router();

import { getMulterUpload } from "../utils/multer.js";

import {
  adminRegister,
  adminLogin,
  userLogin,
  userRegister,
  vendorRegister,
  vendorLogin,
} from "../controller/auth.controller.js";

// Use global multer utility for vendor logos
const logoUpload = getMulterUpload("vendors");

//admin routes
router.post("/admin-register", adminRegister);
router.post("/admin-login", adminLogin);

//user routes
router.post("/user-register", userRegister);
router.post("/user-login", userLogin);

//vendor routes
router.post("/vendor-register", logoUpload.single("logo"), vendorRegister);
router.post("/vendor-login", vendorLogin); // Assuming vendor login uses the same user login logic

export default router;
