import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function indexFiles(files) {
  const map = {};
  if (!files) return map;
  for (const file of files) {
    if (!map[file.fieldname]) {
      map[file.fieldname] = [];
    }
    map[file.fieldname].push(file);
  }
  return map;
}

export const getDeliveryBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { audience: "DELIVERY_PARTNER", isActive: true },
    });
    return res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching delivery banners:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const getDeliveryNotifications = async (req, res) => {
  const deliveryId = req.user?.id;

  if (!deliveryId || isNaN(deliveryId)) {
    return res
      .status(401)
      .json({ message: "Unauthorized or invalid DELIVERY_PARTNER ID" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: deliveryId }, { role: "DELIVERY_PARTNER" }],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching DELIVERY_PARTNER notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTodayMealSchedulesForDeliveryPartner = async (req, res) => {
  try {
    const deliveryPartnerId = req.user?.id;

    if (!deliveryPartnerId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing delivery partner ID" });
    }

    // Get today's start and end timestamps (00:00 to 23:59)
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const mealSchedules = await prisma.mealSchedule.findMany({
      where: {
        deliveryPartnerId,
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        scheduledDate: "asc",
      },
    });

    return res.status(200).json(mealSchedules);
  } catch (error) {
    console.error("Error fetching meal schedules:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMealScheduleStatus = async (req, res) => {
  const mealScheduleId = parseInt(req.params.id);
  const { status } = req.body;

  if (isNaN(mealScheduleId)) {
    return res.status(400).json({ error: "Invalid MealSchedule ID" });
  }

  if (!Object.values(MealScheduleStatus).includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const updated = await prisma.mealSchedule.update({
      where: { id: mealScheduleId },
      data: { status },
    });

    return res.status(200).json({ message: "Status updated", data: updated });
  } catch (error) {
    console.error("Error updating meal status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getMealsByDeliveryPartner = async (req, res) => {
  try {
    const deliveryPartnerId = req.user?.id;

    if (!deliveryPartnerId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Delivery partner ID missing" });
    }

    const meals = await prisma.mealSchedule.findMany({
      where: {
        deliveryPartnerId,
      },
      orderBy: {
        scheduledDate: "asc",
      },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryState: true,
            deliveryZipCode: true,
            deliveryPhone: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({ meals });
  } catch (error) {
    console.error("Error fetching meals for delivery partner:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateDeliveryPartnerProfile = async (req, res) => {
  try {
    const deliveryPartnerId = req.user?.id;
    const filesByField = indexFiles(req.files);

    if (!deliveryPartnerId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Delivery partner ID missing" });
    }

    const {
      name,
      phoneNumber,
      phoneNumber2,
      // profileImage,
      address,
      city,
      state,
      zipCode,
    } = req.body;

    // get profile image from request (optional)
    const profileImage = filesByField["profile-image"]
      ? `uploads/delivery-partners/${filesByField["profile-image"][0].filename}`
      : null;

    // Prepare update data
    const updateData = {
      name,
      phoneNumber,
      phoneNumber2,
      address,
      city,
      state,
      zipCode,
    };

    // Only include profileImage if it's provided
    if (profileImage) {
      updateData.profileImage = profileImage;
    }

    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id: deliveryPartnerId },
      data: updateData,
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      data: updatedPartner,
    });
  } catch (error) {
    console.error("Error updating delivery partner profile:", error);

    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Phone number or email already in use" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addOrUpdateDeliveryBankDetail = async (req, res) => {
  const deliveryId = req.user?.id;

  if (!deliveryId || isNaN(deliveryId)) {
    return res
      .status(401)
      .json({ message: "Unauthorized or invalid delivery ID" });
  }

  const { accountHolder, accountNumber, ifscCode, bankName } = req.body;

  if (!accountHolder || !accountNumber || !ifscCode || !bankName) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    const existingDetails = await prisma.deliveryBankDetail.findUnique({
      where: { deliveryId },
    });

    if (existingDetails) {
      // Update bank details
      const updatedDetails = await prisma.deliveryBankDetail.update({
        where: { deliveryId },
        data: {
          accountHolder,
          accountNumber,
          ifscCode,
          bankName,
        },
      });

      return res.status(200).json({
        message: "Bank details updated successfully",
        data: updatedDetails,
      });
    } else {
      // Create new bank details
      const newDetails = await prisma.deliveryBankDetail.create({
        data: {
          deliveryId,
          accountHolder,
          accountNumber,
          ifscCode,
          bankName,
        },
      });

      return res.status(201).json({
        message: "Bank details added successfully",
        data: newDetails,
      });
    }
  } catch (error) {
    console.error("Error saving bank details:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        message: `Duplicate value for unique field: ${error.meta.target}`,
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get delivery partner meal schedules with time filters
// Get delivery partner profile
export const getDeliveryPartnerProfile = async (req, res) => {
  try {
    const deliveryPartnerId = req.user?.id;

    if (!deliveryPartnerId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Delivery partner ID missing" });
    }

    // Get delivery partner profile with related data
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        phoneNumber2: true,
        profileImage: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        // Include related bank details
        DeliveryBankDetail: {
          select: {
            id: true,
            accountHolder: true,
            accountNumber: true,
            ifscCode: true,
            bankName: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        // Include wallet information
        DeliveryWallet: {
          select: {
            id: true,
            balance: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!deliveryPartner) {
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: deliveryPartner,
    });
  } catch (error) {
    console.error("Error fetching delivery partner profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getDeliveryPartnerOrders = async (req, res) => {
  try {
    const deliveryPartnerId = req.user?.id;
    const { filter = "today" } = req.query; // today, yesterday, lastWeek, lastMonth

    if (!deliveryPartnerId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Delivery partner ID missing" });
    }

    // Calculate date ranges based on filter
    const now = new Date();
    let startDate, endDate;

    switch (filter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        break;

      case "yesterday":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          23,
          59,
          59,
          999
        );
        break;

      case "lastWeek":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;

      case "lastMonth":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;

      default:
        return res.status(400).json({
          error:
            "Invalid filter. Use: today, yesterday, lastWeek, or lastMonth",
        });
    }

    // Get meal schedules for the delivery partner within the date range
    const meals = await prisma.mealSchedule.findMany({
      where: {
        deliveryPartnerId,
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        scheduledDate: "asc",
      },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryState: true,
            deliveryZipCode: true,
            deliveryPhone: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Calculate summary statistics
    const totalMeals = meals.length;
    const totalAmount = meals.reduce(
      (sum, meal) => sum + (meal.order?.totalAmount || 0),
      0
    );
    const pendingMeals = meals.filter(
      (meal) => meal.status === "SCHEDULED"
    ).length;
    const preparedMeals = meals.filter(
      (meal) => meal.status === "PREPARED"
    ).length;
    const outForDeliveryMeals = meals.filter(
      (meal) => meal.status === "OUT_FOR_DELIVERY"
    ).length;
    const deliveredMeals = meals.filter(
      (meal) => meal.status === "DELIVERED"
    ).length;
    const cancelledMeals = meals.filter(
      (meal) => meal.status === "CANCELLED"
    ).length;

    // Group meals by status
    const mealsByStatus = {
      scheduled: meals.filter((meal) => meal.status === "SCHEDULED"),
      prepared: meals.filter((meal) => meal.status === "PREPARED"),
      outForDelivery: meals.filter(
        (meal) => meal.status === "OUT_FOR_DELIVERY"
      ),
      delivered: meals.filter((meal) => meal.status === "DELIVERED"),
      cancelled: meals.filter((meal) => meal.status === "CANCELLED"),
      other: meals.filter(
        (meal) =>
          ![
            "SCHEDULED",
            "PREPARED",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "CANCELLED",
          ].includes(meal.status)
      ),
    };

    return res.status(200).json({
      success: true,
      filter,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        readable: {
          start: startDate.toLocaleDateString(),
          end: endDate.toLocaleDateString(),
        },
      },
      summary: {
        totalMeals,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        scheduled: pendingMeals,
        prepared: preparedMeals,
        outForDelivery: outForDeliveryMeals,
        delivered: deliveredMeals,
        cancelled: cancelledMeals,
      },
      mealsByStatus,
      meals,
    });
  } catch (error) {
    console.error("Error fetching delivery partner meal schedules:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// save current location
export const saveCurrentLocationDeliveryPartner = async (req, res) => {
  const deliveryPartnerId = req.user?.id;
  const { latitude, longitude } = req.body;

  if (!deliveryPartnerId) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Delivery partner ID missing" });
  }

  if (!latitude || !longitude) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required" });
  }

  const updatedDeliveryPartner = await prisma.deliveryPartner.update({
    where: { id: deliveryPartnerId },
    data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
  });

  return res.status(200).json({
    success: true,
    message: "Current location saved successfully",
    data: updatedDeliveryPartner,
  });
};

// online offline toggle
export const toggleOnlineOfflineDeliveryPartner = async (req, res) => {
  try {
    const deliveryPartnerId = req.user?.id;

    if (!deliveryPartnerId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Delivery partner ID missing" });
    }

    // First get the current delivery partner to check current status
    const currentDeliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      select: { id: true, isActive: true },
    });

    if (!currentDeliveryPartner) {
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    // Toggle the current status (if true, make false; if false, make true)
    const newStatus = !currentDeliveryPartner.isActive;

    const updatedDeliveryPartner = await prisma.deliveryPartner.update({
      where: { id: deliveryPartnerId },
      data: { isActive: newStatus },
    });

    return res.status(200).json({
      success: true,
      message: `Status updated to ${
        newStatus ? "online" : "offline"
      } successfully`,
      data: {
        id: updatedDeliveryPartner.id,
        isActive: updatedDeliveryPartner.isActive,
        previousStatus: currentDeliveryPartner.isActive,
        newStatus: newStatus,
      },
    });
  } catch (error) {
    console.error("Error toggling delivery partner online status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
