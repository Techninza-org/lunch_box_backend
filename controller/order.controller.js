import { PrismaClient } from "@prisma/client";

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
    const {
      orderType = "ONETIME", // ONETIME, WEEKLY, MONTHLY
      paymentType,
      paymentId,
      deliveryAddressId,
      subscriptionStartDate,
      orderNotes,
      walletTransactionId,
      finalpaymentAmount,
      finaldeliveryCharges,
    } = req.body;

    // Validate required fields
    if (!paymentType) {
      return res.status(400).json({
        success: false,
        message: "Payment type is required",
      });
    }

    if (!deliveryAddressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (!finaldeliveryCharges || isNaN(parseInt(finaldeliveryCharges))) {
      return res.status(400).json({
        success: false,
        message: "Valid delivery charges is required",
      });
    }

    if (!finalpaymentAmount || isNaN(parseInt(finalpaymentAmount))) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
    }

    // Get user's cart items
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

    if (cartItems.length === 0) {
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
    if (!allSameVendor) {
      return res.status(400).json({
        success: false,
        message: "All items must be from the same vendor",
      });
    }

    // Get delivery address
    const deliveryAddress = await prisma.userAddress.findUnique({
      where: {
        id: Number(deliveryAddressId),
        userId: userId,
      },
    });

    if (!deliveryAddress) {
      return res.status(404).json({
        success: false,
        message: "Delivery address not found",
      });
    }

    // get settings for delivery charges
    const setting = await prisma.settings.findFirst();
    const perKmDeliveryCharge = setting?.deliveryChargePerKm || 0;



    // Calculate pricing
    const subtotal = finalpaymentAmount || cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryCharges = finaldeliveryCharges;
    const taxes = 0;
    const discount = 0; // Can be implemented later
    const totalAmount = subtotal + deliveryCharges + taxes - discount;

    // Calculate subscription details
    let subscriptionEndDate = null;
    let totalMealsInSubscription = null;
    const startDate = subscriptionStartDate
      ? new Date(subscriptionStartDate)
      : new Date();

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

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId: userId,
          vendorId: vendorId,
          orderType: orderType,
          subtotal: subtotal,
          deliveryCharges: deliveryCharges,
          taxes: taxes,
          discount: discount,
          totalAmount: totalAmount,
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
          orderNotes: orderNotes,
          walletTransactionId: walletTransactionId || null,
        },
      });

      // Create order items from cart items
      for (const cartItem of cartItems) {
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
          },
        });

        // Create order item options
        for (const selectedOption of cartItem.selectedOptions) {
          await tx.orderItemOption.create({
            data: {
              orderItemId: orderItem.id,
              optionId: selectedOption.optionId,
              optionName: `Option ${selectedOption.optionId}`, // You might want to fetch actual option name
              quantity: selectedOption.quantity,
              unitPrice: selectedOption.price,
              totalPrice: selectedOption.price * selectedOption.quantity,
            },
          });
        }

        // Create meal schedules based on order type
        await createMealSchedules(
          tx,
          newOrder,
          orderItem,
          orderType,
          startDate
        );
      }

      // Clear cart after successful order creation
      await tx.cartItem.deleteMany({
        where: { userId: userId },
      });

      return newOrder;
    });

    // Fetch complete order details
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

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: completeOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
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

  if (orderType === "ONETIME") {
    // For one-time orders, create schedule for delivery date or tomorrow
    const deliveryDate = new Date(startDate);
    deliveryDate.setDate(deliveryDate.getDate() + 1); // Next day delivery

    schedules.push({
      orderId: order.id,
      orderItemId: orderItem.id,
      vendorId: order.vendorId, // Add vendor ID for delivery operations
      scheduledDate: deliveryDate,
      scheduledTimeSlot: getTimeSlotForMealType(orderItem.mealType),
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
          scheduledTimeSlot: getTimeSlotForMealType(orderItem.mealType),
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
          scheduledTimeSlot: getTimeSlotForMealType(orderItem.mealType),
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
 * Helper function to get time slot based on meal type
 */
function getTimeSlotForMealType(mealType) {
  switch (mealType) {
    case "Breakfast":
      return "08:00-10:00";
    case "Lunch":
      return "12:00-14:00";
    case "Evening":
      return "16:00-18:00";
    case "Dinner":
      return "19:00-21:00";
    default:
      return "12:00-14:00";
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
