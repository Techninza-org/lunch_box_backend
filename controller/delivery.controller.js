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

export const getDeliveryNotifications = async (req, res) => {
  const deliveryId = req.user?.id;

  if (!deliveryId || isNaN(deliveryId)) {
    return res.status(401).json({ message: "Unauthorized or invalid DELIVERY_PARTNER ID" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: deliveryId },
          { role: "DELIVERY_PARTNER" },
        ],
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
      return res.status(401).json({ error: "Unauthorized: Missing delivery partner ID" });
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
        scheduledDate: 'asc',
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
      return res.status(401).json({ error: "Unauthorized: Delivery partner ID missing" });
    }

    const meals = await prisma.mealSchedule.findMany({
      where: {
        deliveryPartnerId,
      },
      orderBy: {
        scheduledDate: 'asc',
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
      return res.status(401).json({ error: "Unauthorized: Delivery partner ID missing" });
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

    // get profile image  from request
    const profileImage = filesByField["profile-image"]
      ? `uploads/delivery-partners/${filesByField["profile-image"][0].filename}`
      : null;

    // Validate profile image
    if (!profileImage) {
      return res
        .status(400)
        .json({ message: "Profile image is required" });
    }

    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id: deliveryPartnerId },
      data: {
        name,
        phoneNumber,
        phoneNumber2,
        profileImage,
        address,
        city,
        state,
        zipCode,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      data: updatedPartner,
    });
  } catch (error) {
    console.error("Error updating delivery partner profile:", error);

    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Phone number or email already in use" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addOrUpdateDeliveryBankDetail = async (req, res) => {
  const deliveryId = req.user?.id;

  if (!deliveryId || isNaN(deliveryId)) {
    return res.status(401).json({ message: "Unauthorized or invalid delivery ID" });
  }

  const {
    accountHolder,
    accountNumber,
    ifscCode,
    bankName,
  } = req.body;

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

// Get delivery partner orders with time filters
export const getDeliveryPartnerOrders = async (req, res) => {
  try {
    const deliveryPartnerId = req.user?.id;
    const { filter = 'today' } = req.query; // today, yesterday, lastWeek, lastMonth

    if (!deliveryPartnerId) {
      return res.status(401).json({ error: "Unauthorized: Delivery partner ID missing" });
    }

    // Calculate date ranges based on filter
    const now = new Date();
    let startDate, endDate;

    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      
      case 'lastWeek':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        endDate = now;
        break;
      
      case 'lastMonth':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        endDate = now;
        break;
      
      default:
        return res.status(400).json({ error: "Invalid filter. Use: today, yesterday, lastWeek, or lastMonth" });
    }

    // Get orders for the delivery partner within the date range
    const orders = await prisma.order.findMany({
      where: {
        deliveryPartnerId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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
        orderItems: {
          include: {
            selectedOptions: true,
          },
        },
        mealSchedules: {
          where: {
            deliveryPartnerId,
          },
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            mealType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary statistics
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const pendingOrders = orders.filter(order => order.status === 'PENDING').length;
    const completedOrders = orders.filter(order => order.status === 'DELIVERED').length;
    const cancelledOrders = orders.filter(order => order.status === 'CANCELLED').length;

    // Group orders by status
    const ordersByStatus = {
      pending: orders.filter(order => order.status === 'PENDING'),
      completed: orders.filter(order => order.status === 'DELIVERED'),
      cancelled: orders.filter(order => order.status === 'CANCELLED'),
      other: orders.filter(order => !['PENDING', 'DELIVERED', 'CANCELLED'].includes(order.status)),
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
        totalOrders,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        pendingOrders,
        completedOrders,
        cancelledOrders,
      },
      ordersByStatus,
      orders,
    });

  } catch (error) {
    console.error("Error fetching delivery partner orders:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};