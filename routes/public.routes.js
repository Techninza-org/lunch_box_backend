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
  deliveryPartnerRegister,
  deliveryPartnerLogin,
  userForgotPassword,
  verifyOtpAndResetPassword

} from "../controller/auth.controller.js";

// Use global multer utility for vendor logos
const logoUpload = getMulterUpload("vendors");
const deliveryPartner = getMulterUpload("delivery-partners");

//admin routes
router.post("/admin-register", adminRegister);
router.post("/admin-login", adminLogin);

//user routes
router.post("/user-register", userRegister);
router.post("/user-login", userLogin);
router.post("/user-forgot-password", userForgotPassword);
router.post("/user-otp-verify", verifyOtpAndResetPassword);

//vendor routes
router.post("/vendor-register", logoUpload.single("logo"), vendorRegister);
router.post("/vendor-login", vendorLogin);

//delivery partner routes
router.post(
  "/delivery-partner-register",
  deliveryPartner.any(),
  deliveryPartnerRegister
);
router.post("/delivery-partner-login", deliveryPartnerLogin);
export default router;
