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
  userVerifyOtpAndResetPassword,
  vendorForgotPassword,
  vendorVerifyOtpAndResetPassword,
  deliveryForgotPassword,
  deliveryVerifyOtpAndResetPassword,
  adminForgotPassword,
  adminVerifyOtpAndResetPassword,
} from "../controller/auth.controller.js";

// Use global multer utility for vendor logos
const logoUpload = getMulterUpload("vendors");
const deliveryPartner = getMulterUpload("delivery-partners");

//admin routes
router.post("/admin-register", adminRegister);
router.post("/admin-login", adminLogin);
router.post("/admin-forgot-password", adminForgotPassword);
router.post("/admin-otp-verify", adminVerifyOtpAndResetPassword);

//user routes
router.post("/user-register", userRegister);
router.post("/user-login", userLogin);
router.post("/user-forgot-password", userForgotPassword);
router.post("/user-otp-verify", userVerifyOtpAndResetPassword);

//vendor routes
// Expect fields: logo, document1, document2, document3, document4
router.post("/vendor-register", logoUpload.any(), vendorRegister);
router.post("/vendor-login", vendorLogin);
router.post("/vendor-forgot-password", vendorForgotPassword);
router.post("/vendor-otp-verify", vendorVerifyOtpAndResetPassword);

//delivery partner routes
router.post(
  "/delivery-partner-register",
  deliveryPartner.any(),
  deliveryPartnerRegister
);
router.post("/delivery-partner-login", deliveryPartnerLogin);
router.post("/delivery-forgot-password", deliveryForgotPassword);
router.post("/delivery-otp-verify", deliveryVerifyOtpAndResetPassword);
export default router;
