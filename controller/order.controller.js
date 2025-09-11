import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { sendUserNotification, sendVendorNotification } from "../utils/pushNoti.js";

const prisma = new PrismaClient();

/**
 * Create a new order from cart items
 * Supports one-time, weekly, and monthly subscriptions
 * @route POST /orders
 * @access User
 */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("👉 User ID:", userId);

    const {
      orderType = "ONETIME", // ONETIME, WEEKLY, MONTHLY
      paymentType,
      paymentId,
      deliveryAddressId,
      subscriptionStartDate,
      orderNotes,
      walletTransactionId,
      finalPaymentAmount,  // Fixed field name
      finalDeliveryCharges,  // Fixed field name
      deliveryChargeperUnit,
    } = req.body;

    console.log("👉 Request body:", req.body);

    // Validate required fields
    if (!paymentType) {
      console.warn("❌ Missing paymentType");
      return res.status(400).json({
        success: false,
        message: "Payment type is required",
      });
    }

    if (!deliveryAddressId) {
      console.warn("❌ Missing deliveryAddressId");
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    // Get user's cart items
    console.log("🔍 Fetching cart items for user:", userId);
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: userId },
      include: {
        meal: {
          include: {
            vendor: true,
          },
        },
        selectedOptions: true,
      },
    });
    console.log("👉 Cart items found:", cartItems.length);

    if (cartItems.length === 0) {
      console.warn("❌ Cart is empty for user:", userId);
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Verify all items are from the same vendor
    const vendorId = cartItems[0].meal.vendorId;
    const allSameVendor = cartItems.every(
      (item) => item.meal.vendorId === vendorId
    );
    console.log("👉 Vendor ID:", vendorId, "All same vendor?", allSameVendor);

    if (!allSameVendor) {
      console.warn("❌ Items from multiple vendors in cart");
      return res.status(400).json({
        success: false,
        message: "All items must be from the same vendor",
      });
    }

    // Get delivery address
    console.log("🔍 Fetching delivery address:", deliveryAddressId);
    const deliveryAddress = await prisma.userAddress.findUnique({
      where: {
        id: Number(deliveryAddressId),
        userId: userId,
      },
    });
    console.log("👉 Delivery address:", deliveryAddress);

    if (!deliveryAddress) {
      console.warn("❌ Delivery address not found:", deliveryAddressId);
      return res.status(404).json({
        success: false,
        message: "Delivery address not found",
      });
    }

    // Get user location for distance calculation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
      },
    });

    // Calculate delivery charges based on distance if not provided
    let deliveryCharges = 0;

    // If finalDeliveryCharges is provided in request, use it

    deliveryCharges = parseFloat(finalDeliveryCharges);

    // Calculate pricing
    const subtotal =
      (finalPaymentAmount !== undefined && finalPaymentAmount !== null)
        ? parseFloat(finalPaymentAmount)
        : cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const taxes = 0;
    const discount = 0; // Can be implemented later
    const totalAmount = subtotal + deliveryCharges + taxes - discount;

    console.log("💰 Pricing:", {
      subtotal,
      deliveryCharges,
      taxes,
      discount,
      totalAmount,
    });

    // Validate pricing calculations
    if (isNaN(totalAmount)) {
      console.warn("❌ Invalid total amount calculation");
      return res.status(400).json({
        success: false,
        message: "Invalid pricing calculation",
      });
    }

    if (isNaN(deliveryCharges)) {
      console.warn("❌ Invalid delivery charges");
      return res.status(400).json({
        success: false,
        message: "Invalid delivery charges",
      });
    }

    // Calculate subscription details
    let subscriptionEndDate = null;
    let totalMealsInSubscription = null;
    const startDate = subscriptionStartDate
      ? new Date(subscriptionStartDate)
      : new Date();

    console.log("👉 Order type:", orderType, "Start date:", startDate);

    if (orderType === "WEEKLY") {
      subscriptionEndDate = new Date(startDate);
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 7);
      totalMealsInSubscription =
        cartItems.reduce((sum, item) => sum + item.quantity, 0) * 7;
    } else if (orderType === "MONTHLY") {
      subscriptionEndDate = new Date(startDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      totalMealsInSubscription =
        cartItems.reduce((sum, item) => sum + item.quantity, 0) * 30;
    } else {
      totalMealsInSubscription = cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
    }

    console.log("📅 Subscription:", {
      subscriptionEndDate,
      totalMealsInSubscription,
    });

    // Create order with transaction
    console.log("📝 Starting transaction to create order...");
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId: userId,
          vendorId: vendorId,
          orderType: orderType,
          subtotal: parseFloat(subtotal),
          deliveryCharges: parseFloat(deliveryCharges),
          taxes: parseFloat(taxes),
          discount: parseFloat(discount),
          totalAmount: parseFloat(totalAmount),
          paymentType: paymentType,
          paymentId: paymentId,
          paymentStatus:
            paymentType === "CASH_ON_DELIVERY" ? "PENDING" : "COMPLETED",
          deliveryAddress: deliveryAddress.address,
          deliveryCity: deliveryAddress.city,
          deliveryState: deliveryAddress.state,
          deliveryZipCode: deliveryAddress.zipCode,
          deliveryPhone: deliveryAddress.phoneNumber,
          deliveryLat: deliveryAddress.latitude,
          deliveryLng: deliveryAddress.longitude,
          subscriptionStartDate: startDate,
          subscriptionEndDate: subscriptionEndDate,
          totalMealsInSubscription: totalMealsInSubscription,
          orderNotes: orderNotes || "",
          walletTransactionId: walletTransactionId ? parseInt(walletTransactionId) : null,
          deliveryChargeperUnit: deliveryChargeperUnit || 0,

        },
      });
      console.log("✅ Order created:", newOrder.id);

      // Create order items from cart items
      for (const cartItem of cartItems) {
        console.log("🛒 Creating order item for meal:", cartItem.mealId);
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            mealId: cartItem.mealId,
            mealTitle: cartItem.meal.title,
            mealDescription: cartItem.meal.description,
            mealImage: cartItem.meal.image,
            mealType: cartItem.meal.type,
            mealCuisine: cartItem.meal.cuisine,
            isVeg: cartItem.meal.isVeg,
            quantity: cartItem.quantity,
            unitPrice: cartItem.meal.basePrice,
            totalPrice: cartItem.totalPrice,
            deliveryChargeperUnit: deliveryChargeperUnit || 0,

          },
        });

        // Create order item options
        for (const selectedOption of cartItem.selectedOptions) {
          console.log("   ➕ Adding option:", selectedOption.optionId);
          await tx.orderItemOption.create({
            data: {
              orderItemId: orderItem.id,
              optionId: selectedOption.optionId,
              optionName: `Option ${selectedOption.optionId}`, // temp placeholder
              quantity: selectedOption.quantity,
              unitPrice: selectedOption.price,
              totalPrice: selectedOption.price * selectedOption.quantity,
            },
          });
        }

        // Create meal schedules based on order type
        console.log("📅 Creating meal schedule for order item:", orderItem.id);
        await createMealSchedules(
          tx,
          newOrder,
          orderItem,
          orderType,
          startDate
        );
      }

      // Clear cart after successful order creation
      console.log("🧹 Clearing cart for user:", userId);
      await tx.cartItem.deleteMany({
        where: { userId: userId },
      });

      return newOrder;
    });

    // Fetch complete order details with user and vendor FCM tokens
    console.log("🔍 Fetching complete order details:", order.id);
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            logo: true,
            phoneNumber: true,
            fcmToken: true, // Include FCM token for push notification
          },
        },
        orderItems: {
          include: {
            selectedOptions: true,
          },
        },
        mealSchedules: {
          orderBy: { scheduledDate: "asc" },
        },
        user: {
          select: {
            id: true,
            name: true,
            fcmToken: true, // Include FCM token for push notification
          },
        },
      },
    });

    // Send push notifications to user and vendor
    try {
      // Send notification to user
      if (completeOrder.user && completeOrder.user.fcmToken) {
        await sendUserNotification(
          completeOrder.user.id,
          "Order Placed Successfully",
          `Your order #${completeOrder.id} has been placed successfully`,
          { orderId: completeOrder.id.toString(), type: "ORDER_PLACED" }
        );
      }

      // Send notification to vendor
      if (completeOrder.vendor && completeOrder.vendor.fcmToken) {
        await sendVendorNotification(
          completeOrder.vendor.id,
          "New Order Received",
          `You have received a new order #${completeOrder.id} from ${completeOrder.user.name}`,
          { orderId: completeOrder.id.toString(), type: "NEW_ORDER" }
        );
      }
    } catch (notificationError) {
      console.error("Error sending push notifications:", notificationError);
      // Don't fail the request if notifications fail
    }

    console.log("✅ Order process completed successfully:", completeOrder.id);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: completeOrder,
    });
  } catch (error) {
    console.error("💥 Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


/**
 * Helper function to create meal schedules
 */
async function createMealSchedules(tx, order, orderItem, orderType, startDate) {
  const schedules = [];

  // Fetch vendor with time slots
  const vendor = await tx.vendor.findUnique({
    where: { id: order.vendorId },
    select: {
      breakfastStart: true,
      breakfastEnd: true,
      lunchStart: true,
      lunchEnd: true,
      eveningStart: true,
      eveningEnd: true,
      dinnerStart: true,
      dinnerEnd: true,
    }
  });

  if (!vendor) {
    throw new Error("Vendor not found");
  }

  if (orderType === "ONETIME") {
    // For one-time orders, create schedule for delivery date or tomorrow
    const deliveryDate = new Date(startDate);
    deliveryDate.setDate(deliveryDate.getDate()); // Next day delivery

    schedules.push({
      orderId: order.id,
      orderItemId: orderItem.id,
      vendorId: order.vendorId, // Add vendor ID for delivery operations
      scheduledDate: deliveryDate,
      scheduledTimeSlot: getVendorTimeSlotForMealType(vendor, orderItem.mealType),
      mealType: orderItem.mealType,
      mealTitle: orderItem.mealTitle,
      mealImage: orderItem.mealImage,
      quantity: orderItem.quantity,
    });
  } else if (orderType === "WEEKLY") {
    // Create 7 days of schedules
    for (let day = 0; day < 7; day++) {
      const scheduleDate = new Date(startDate);
      scheduleDate.setDate(scheduleDate.getDate() + day);

      for (let qty = 0; qty < orderItem.quantity; qty++) {
        schedules.push({
          orderId: order.id,
          orderItemId: orderItem.id,
          vendorId: order.vendorId, // Add vendor ID for delivery operations
          scheduledDate: scheduleDate,
          scheduledTimeSlot: getVendorTimeSlotForMealType(vendor, orderItem.mealType),
          mealType: orderItem.mealType,
          mealTitle: orderItem.mealTitle,
          mealImage: orderItem.mealImage,
          quantity: 1, // Each schedule is for 1 meal
        });
      }
    }
  } else if (orderType === "MONTHLY") {
    // Create 30 days of schedules
    for (let day = 0; day < 30; day++) {
      const scheduleDate = new Date(startDate);
      scheduleDate.setDate(scheduleDate.getDate() + day);

      for (let qty = 0; qty < orderItem.quantity; qty++) {
        schedules.push({
          orderId: order.id,
          orderItemId: orderItem.id,
          vendorId: order.vendorId, // Add vendor ID for delivery operations
          scheduledDate: scheduleDate,
          scheduledTimeSlot: getVendorTimeSlotForMealType(vendor, orderItem.mealType),
          mealType: orderItem.mealType,
          mealTitle: orderItem.mealTitle,
          mealImage: orderItem.mealImage,
          quantity: 1, // Each schedule is for 1 meal
        });
      }
    }
  }

  // Create all schedules
  for (const schedule of schedules) {
    await tx.mealSchedule.create({ data: schedule });
  }
}

/**
 * Helper function to get vendor-specific time slot based on meal type
 */
function getVendorTimeSlotForMealType(vendor, mealType) {
  switch (mealType) {
    case "Breakfast":
      if (vendor.breakfastStart && vendor.breakfastEnd) {
        return `${vendor.breakfastStart}-${vendor.breakfastEnd}`;
      }
      return "08:00-10:00"; // fallback to default
    case "Lunch":
      if (vendor.lunchStart && vendor.lunchEnd) {
        return `${vendor.lunchStart}-${vendor.lunchEnd}`;
      }
      return "12:00-14:00"; // fallback to default
    case "Evening":
      if (vendor.eveningStart && vendor.eveningEnd) {
        return `${vendor.eveningStart}-${vendor.eveningEnd}`;
      }
      return "16:00-18:00"; // fallback to default
    case "Dinner":
      if (vendor.dinnerStart && vendor.dinnerEnd) {
        return `${vendor.dinnerStart}-${vendor.dinnerEnd}`;
      }
      return "19:00-21:00"; // fallback to default
    default:
      return "12:00-14:00"; // fallback to default
  }
}

/**
 * Get user's orders
 * @route GET /orders
 * @access User
 */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, orderType } = req.query;

    const whereClause = { userId: userId };
    if (status) whereClause.status = status;
    if (orderType) whereClause.orderType = orderType;

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            logo: true,
          },
        },
        orderItems: {
          include: {
            selectedOptions: true,
          },
        },
        _count: {
          select: {
            mealSchedules: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const totalOrders = await prisma.order.count({
      where: whereClause,
    });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalOrders / Number(limit)),
          totalOrders,
          hasNextPage: Number(page) * Number(limit) < totalOrders,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get order details by ID
 * @route GET /orders/:orderId
 * @access User
 */
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
        userId: userId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            logo: true,
            phoneNumber: true,
            address: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        orderItems: {
          include: {
            selectedOptions: true,
          },
        },
        mealSchedules: {
          orderBy: { scheduledDate: "asc" },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Cancel an order
 * @route PATCH /orders/:orderId/cancel
 * @access User
 */
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { cancelReason } = req.body;

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
        userId: userId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage",
      });
    }

    // Update order status and cancel future meal schedules
    await prisma.$transaction(async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: Number(orderId) },
        data: {
          status: "CANCELLED",
          cancelReason: cancelReason,
        },
      });

      // Cancel future meal schedules
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await tx.mealSchedule.updateMany({
        where: {
          orderId: Number(orderId),
          scheduledDate: { gte: today },
          status: "SCHEDULED",
        },
        data: {
          status: "CANCELLED",
        },
      });
    });

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get today's meal schedules for cron job
 * @route GET /orders/schedules/today
 * @access Internal/Cron
 */
export const getTodayMealSchedules = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await prisma.mealSchedule.findMany({
      where: {
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: "SCHEDULED",
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            phoneNumber: true,
            address: true,
            city: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: [{ scheduledTimeSlot: "asc" }, { mealType: "asc" }],
    });

    res.status(200).json({
      success: true,
      data: {
        schedules,
        totalSchedules: schedules.length,
        date: today.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Error fetching today's schedules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update meal schedule status
 * @route PATCH /orders/schedules/:scheduleId/status
 * @access Vendor/Admin
 */
export const updateMealScheduleStatus = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { status, actualDeliveryTime, notes } = req.body;

    const validStatuses = [
      "SCHEDULED",
      "PREPARED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "MISSED",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updateData = { status, notes };
    if (status === "DELIVERED" && actualDeliveryTime) {
      updateData.actualDeliveryTime = new Date(actualDeliveryTime);
    }

    const schedule = await prisma.mealSchedule.update({
      where: { id: Number(scheduleId) },
      data: updateData,
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Schedule status updated successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Error updating schedule status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get user's meal schedules
 * @route GET /orders/schedules
 * @access User
 */
export const getUserMealSchedules = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, status, mealType } = req.query;

    const whereClause = {
      order: { userId: userId },
    };

    if (startDate && endDate) {
      whereClause.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) whereClause.status = status;
    if (mealType) whereClause.mealType = mealType;

    const schedules = await prisma.mealSchedule.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderType: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            logo: true,
            phoneNumber: true,
            address: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching user schedules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get vendor's meal schedules for delivery operations
 * @route GET /vendor/schedules
 * @access Vendor
 */
export const getVendorMealSchedules = async (req, res) => {
  try {
    const vendorId = req.user.id; // Assuming vendor auth middleware sets this
    const { startDate, endDate, status, mealType } = req.query;

    const whereClause = {
      vendorId: vendorId,
    };

    if (startDate && endDate) {
      whereClause.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) whereClause.status = status;
    if (mealType) whereClause.mealType = mealType;

    const schedules = await prisma.mealSchedule.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderType: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryPhone: true,
            deliveryLat: true,
            deliveryLng: true,
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTimeSlot: "asc" }],
    });

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching vendor schedules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Assign delivery partner to meal schedule
 * @route PATCH /schedules/:scheduleId/assign-delivery-partner
 * @access Vendor/Admin
 */
export const assignDeliveryPartner = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { deliveryPartnerId } = req.body;

    if (!deliveryPartnerId) {
      return res.status(400).json({
        success: false,
        message: "Delivery partner ID is required",
      });
    }

    // Verify delivery partner exists and is active
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: Number(deliveryPartnerId) },
    });

    if (!deliveryPartner || !deliveryPartner.isActive) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive delivery partner",
      });
    }

    const schedule = await prisma.mealSchedule.update({
      where: { id: Number(scheduleId) },
      data: {
        deliveryPartnerId: Number(deliveryPartnerId),
        status: "PREPARED", // Update status when delivery partner is assigned
      },
      include: {
        order: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
        vendor: {
          select: {
            name: true,
            businessName: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Delivery partner assigned successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Error assigning delivery partner:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get delivery partner's assigned meal schedules
 * @route GET /delivery-partner/schedules
 * @access DeliveryPartner
 */
export const getDeliveryPartnerSchedules = async (req, res) => {
  try {
    const deliveryPartnerId = req.deliveryPartner.id; // Assuming delivery partner auth middleware sets this
    const { startDate, endDate, status } = req.query;

    const whereClause = {
      deliveryPartnerId: deliveryPartnerId,
    };

    if (startDate && endDate) {
      whereClause.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) whereClause.status = status;

    const schedules = await prisma.mealSchedule.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryPhone: true,
            deliveryLat: true,
            deliveryLng: true,
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            phoneNumber: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTimeSlot: "asc" }],
    });

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching delivery partner schedules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Bulk update meal schedule statuses for vendor operations
 * @route PATCH /vendor/schedules/bulk-update
 * @access Vendor
 */
export const bulkUpdateScheduleStatus = async (req, res) => {
  try {
    const { scheduleIds, status, notes } = req.body;

    if (
      !scheduleIds ||
      !Array.isArray(scheduleIds) ||
      scheduleIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Schedule IDs array is required",
      });
    }

    const validStatuses = [
      "SCHEDULED",
      "PREPARED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "MISSED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updateData = { status };
    if (notes) updateData.notes = notes;
    if (status === "DELIVERED") {
      updateData.actualDeliveryTime = new Date();
    }

    const updatedSchedules = await prisma.mealSchedule.updateMany({
      where: {
        id: { in: scheduleIds.map((id) => Number(id)) },
      },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: `${updatedSchedules.count} schedules updated successfully`,
      data: { updatedCount: updatedSchedules.count },
    });
  } catch (error) {
    console.error("Error bulk updating schedules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get meal schedule statistics for vendor dashboard
 * @route GET /vendor/schedule-stats
 * @access Vendor
 */
export const getVendorScheduleStats = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const stats = await prisma.mealSchedule.groupBy({
      by: ["status"],
      where: {
        vendorId: vendorId,
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      _count: {
        id: true,
      },
    });

    const totalSchedules = await prisma.mealSchedule.count({
      where: {
        vendorId: vendorId,
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    // Transform stats into a more usable format
    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        date: targetDate.toISOString().split("T")[0],
        totalSchedules,
        statusBreakdown: statusStats,
        completionRate:
          totalSchedules > 0
            ? (((statusStats.DELIVERED || 0) / totalSchedules) * 100).toFixed(2)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor schedule stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper function to calculate driving distance using Google Maps API
async function getDrivingDistance(userLat, userLng, restLat, restLng) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("GOOGLE_MAPS_API_KEY not found in environment variables");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${userLat},${userLng}&destinations=${restLat},${restLng}&mode=driving&key=${apiKey}`;

    const res = await axios.get(url);
    const data = res.data;

    if (data.rows[0].elements[0].status === "OK") {
      const distanceText = data.rows[0].elements[0].distance.text; // "12.3 km"
      const distanceValue = data.rows[0].elements[0].distance.value; // in meters
      const duration = data.rows[0].elements[0].duration.text; // "25 mins"

      return {
        distanceKm: distanceValue / 1000,
        distanceText,
        duration,
      };
    } else {
      throw new Error("No route found");
    }
  } catch (err) {
    console.error("Error fetching distance:", err.message);
    return null;
  }
}
