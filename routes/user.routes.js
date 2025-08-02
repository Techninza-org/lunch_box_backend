import { Router } from "express";
const router = Router();
import {
  getHomePage,
  addUserCurrentLocation,
  getAllRestaurantsByUserLocation,
  getRestaurantsById,
  getMealsByVendorAndType,
  searchMeals,
  getMealById,
} from "../controller/user.controller.js";

router.post("/add-current-location", addUserCurrentLocation);
router.get("/home", getHomePage);
// Get all restaurants by user location
router.get(
  "/get-all-restaurants-by-user-location",
  getAllRestaurantsByUserLocation
);
router.get("/get-restaurant-by-id/:id", getRestaurantsById);
// Get meals by vendor and type
router.get("/meals/vendor/:vendorId/type/:type", getMealsByVendorAndType);
// Search meals
router.get("/meals/search", searchMeals);
// Get meal details by ID
router.get("/meals/:id", getMealById);

export default router;
