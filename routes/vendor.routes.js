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
const upload = getMulterUpload("meals");

// Define vendor routes here
router.post("/add-meal", upload.any(), addVendorMeal);
router.get("/get-meals", getMealsByVendor);
router.get("/get-meals/:id", getMealByIdVendor);
router.patch("/update-meal/:id", upload.any(), updateVendorMeal);
router.put("/update-status/:id", updateStatusMealVendor);
router.delete("/soft-delete/:id", softDeleteMealVendor);

// Export the router

export default router;
