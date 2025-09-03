import { Router } from "express";
const router = Router();
import { getMulterUpload } from "../utils/multer.js";
import {
  getHomePage,
  addUserCurrentLocation,
  getAllRestaurantsByUserLocation,
  getRestaurantsById,
  getMealsByVendorAndType,
  searchMeals,
  getMealById,
  addAddress,
  setDefaultAddress,
  getAddress,
  deleteAddress,
  getUserNotifications,
  updateUserProfile,
  // getUserWallet,
  getUserProfile,
  getVendorsByMealType,
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  getFilteredMeals,
  
} from "../controller/user.controller.js";

import { 
  createSupportTicket,
  getSupportTickets,
  sendMessageToSupportTicket
 } from "../controller/support.controller.js";

import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
} from "../controller/cart.controller.js";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createUserWalletOrder,
  verifyUserWalletPayment,
  getUserWallet,
  createUserDebitTransaction
} from "../controller/payment.controller.js";

const logoUpload = getMulterUpload("users");

router.post("/add-current-location", addUserCurrentLocation);
router.post("/add-address", addAddress);
router.get("/set-default-address/:addressId", setDefaultAddress);
router.get("/get-addresses", getAddress);
router.delete("/delete-address/:addressId", deleteAddress);
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
router.get("/meals", getVendorsByMealType);
router.get("/get-filtered-meals/:vendorId", getFilteredMeals);

// CART ROUTES
// Add meal to cart (handles both single and customizable meals)
router.post("/cart/add", addToCart);
// Get user's cart items
router.get("/cart", getCart);
// Get cart summary (count and total)
router.get("/cart/summary", getCartSummary);
// Clear entire cart (must come before parameterized routes)
router.delete("/cart/clear", clearCart);
// Update cart item quantity
router.patch("/cart/:cartItemId", updateCartItem);
// Remove specific item from cart
router.delete("/cart/:cartItemId", removeFromCart);
// Get user notifications
router.get("/get-user-notifications", getUserNotifications);
// User profile management
router.put(
  "/update-profile",
  logoUpload.single("profileImage"),
  updateUserProfile
);
router.get("/get-user-profile", getUserProfile);

// payment routes
router.post("/create-razorpay-order", createRazorpayOrder);
router.post("/verify-payment", verifyRazorpayPayment);

// User wallet routes
router.post("/create-user-wallet-order", createUserWalletOrder);
router.post("/verify-user-wallet", verifyUserWalletPayment);
router.get("/get-user-wallet", getUserWallet);
router.post("/debit-user-wallet", createUserDebitTransaction);


// Support routes
router.post("/create-user-support-ticket", createSupportTicket);
router.get("/get-user-support-tickets", getSupportTickets);
router.post("/send-message-to-support-ticket-user/:ticketId", sendMessageToSupportTicket);

// Wishlist routes

router.post("/add-user-wishlist", addToWishlist);
router.delete("/remove-user-wishlist", removeFromWishlist);
router.get("/get-all-user-wishlist", getUserWishlist);




export default router;
