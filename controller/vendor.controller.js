import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { saveNotification } from "../utils/saveNotification.js";

export const updateVendorProfile = async (req, res) => {
  const id = req.user?.id;
  if (isNaN(id)) return res.status(400).json({ message: "Invalid vendor ID" });

  const {
    name,
    // email, <- removed from destructuring
    phoneNumber,
    businessName,
    description,
    phoneNumber2,
    address,
    city,
    state,
    // longitude,
    // latitude,
  } = req.body;

  const logo = req.file ? req.file.filename : null;

  try {
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });

    if (!existingVendor || existingVendor.isDeleted) {
      return res.status(404).json({ message: "Vendor not found or deleted" });
    }

    // ✅ Do not allow email update
    // ✅ Only check phone number duplication
    if (phoneNumber && phoneNumber !== existingVendor.phoneNumber) {
      const phoneExists = await prisma.vendor.findFirst({
        where: { phoneNumber, NOT: { id } },
      });
      if (phoneExists) {
        return res.status(409).json({ message: "Phone number already in use" });
      }
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        phoneNumber,
        phoneNumber2,
        businessName,
        description,
        address,
        city,
        state,
        logo: logo ? `uploads/vendors/${logo}` : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true, // still returned but not updated
        businessName: true,
        status: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // ✅ Save notification
    await saveNotification({
      title: "Profile Updated",
      message: "Your vendor profile was successfully updated.",
      userId: id,
      role: "VENDOR",
    });

    res.status(200).json({
      message: "Vendor profile updated successfully",
      vendor: updatedVendor,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateVendorMealTimes = async (req, res) => {
  const id = req.user?.id;
  if (isNaN(id)) return res.status(400).json({ message: "Invalid vendor ID" });

  const {
    breakfastStart,
    breakfastEnd,
    lunchStart,
    lunchEnd,
    eveningStart,
    eveningEnd,
    dinnerStart,
    dinnerEnd,
  } = req.body;

  try {
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });

    if (!existingVendor || existingVendor.isDeleted) {
      return res.status(404).json({ message: "Vendor not found or deleted" });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        breakfastStart,
        breakfastEnd,
        lunchStart,
        lunchEnd,
        eveningStart,
        eveningEnd,
        dinnerStart,
        dinnerEnd,
      },
      select: {
        id: true,
        name: true,
        breakfastStart: true,
        breakfastEnd: true,
        lunchStart: true,
        lunchEnd: true,
        eveningStart: true,
        eveningEnd: true,
        dinnerStart: true,
        dinnerEnd: true,
      },
    });

    return res.status(200).json({
      message: "Meal times updated successfully",
      vendor: updatedVendor,
    });
  } catch (err) {
    console.error("Error updating meal times:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addOrUpdateVendorBankDetail = async (req, res) => {
  const vendorId = req.user?.id;
  console.log("Vendor ID from token:", vendorId);

  if (!vendorId || isNaN(vendorId)) {
    return res.status(401).json({ message: "Unauthorized or invalid vendor ID" });
  }

  const {
    accountHolder,
    accountNumber,
    ifscCode,
    bankName,
    // branchName,
    // upiId,
  } = req.body;

  if (!accountHolder || !accountNumber || !ifscCode || !bankName) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    const existingDetails = await prisma.vendorBankDetail.findUnique({
      where: { vendorId },
    });

    if (existingDetails) {
      // Update bank details
      const updatedDetails = await prisma.vendorBankDetail.update({
        where: { vendorId },
        data: {
          accountHolder,
          accountNumber,
          ifscCode,
          bankName,
        //   branchName,
        //   upiId,
        },
      });

      return res.status(200).json({
        message: "Bank details updated successfully",
        data: updatedDetails,
      });
    } else {
      // Create new bank details
      const newDetails = await prisma.vendorBankDetail.create({
        data: {
          vendorId,
          accountHolder,
          accountNumber,
          ifscCode,
          bankName,
        //   branchName,
        //   upiId,
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

export const toggleVendorActive = async (req, res) => {
  const vendorId = req.user?.id;

  if (!vendorId || isNaN(vendorId)) {
    return res.status(401).json({ message: "Unauthorized or invalid vendor ID" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });

    if (!vendor || vendor.isDeleted) {
      return res.status(404).json({ message: "Vendor not found or deleted" });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        isActive: !vendor.isActive, // Toggle the boolean
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: `Vendor is now ${updatedVendor.isActive ? "active" : "inactive"}`,
      vendor: updatedVendor,
    });
  } catch (err) {
    console.error("Error toggling isActive:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getVendorProfile = async (req, res) => {
  const vendorId = req.user?.id;

  if (!vendorId || isNaN(vendorId)) {
    return res.status(401).json({ message: "Unauthorized or invalid vendor ID" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        VendorBankDetail: true,
        // You can also include:
        // VendorWallet: true,
        // VendorWalletTransaction: true,
        // Meal: true,
        // Order: true,
        // MealSchedule: true,
      },
    });

    if (!vendor || vendor.isDeleted) {
      return res.status(404).json({ message: "Vendor not found or deleted" });
    }

    return res.status(200).json({ vendor });
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getVendorNotifications = async (req, res) => {
  const vendorId = req.user?.id;

  if (!vendorId || isNaN(vendorId)) {
    return res.status(401).json({ message: "Unauthorized or invalid vendor ID" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: vendorId },
          { role: "VENDOR" },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching vendor notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const searchMeals = async (req, res) => {
  const { query } = req.query;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ message: "Query string is required" });
  }

  try {
    // Fetch all meals (or limit if needed)
    const meals = await prisma.meal.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        image: true,
        description: true,
        type: true,
        isVeg: true,
        basePrice: true,
        isAvailable: true,
      },
      orderBy: {
        title: "asc",
      },
    });

    // Filter meals in JS (case-insensitive)
    const filteredMeals = meals.filter((meal) =>
      meal.title.toLowerCase().includes(query.toLowerCase())
    );

    res.status(200).json({ meals: filteredMeals });
  } catch (error) {
    console.error("Error searching meals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getVendorOrderInsights = async (req, res) => {
  try {
    const vendorId = req.user?.id;

    if (!vendorId) {
      return res.status(401).json({ error: "Unauthorized: Vendor ID missing" });
    }

    // Fetch order counts by status and total meals
    const [totalOrders, pending, confirmed, completed, cancelled, totalMeals] = await Promise.all([
      prisma.order.count({ where: { vendorId } }),
      prisma.order.count({ where: { vendorId, status: "PENDING" } }),
      prisma.order.count({ where: { vendorId, status: "CONFIRMED" } }),
      prisma.order.count({ where: { vendorId, status: "COMPLETED" } }),
      prisma.order.count({ where: { vendorId, status: "CANCELLED" } }),
      prisma.order.aggregate({
        _sum: {
          totalMealsInSubscription: true,
        },
        where: {
          vendorId,
        },
      }),
    ]);

    return res.status(200).json({
      totalOrders,
      pending,
      confirmed,
      completed,
      cancelled,
      totalMeals: totalMeals._sum.totalMealsInSubscription || 0,
    });
  } catch (error) {
    console.error("Error getting vendor order insights:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getSupportTickets = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role !== "VENDOR") {
      return res.status(403).json({ error: "Access denied. Only vendors can access this endpoint." });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        role,
        status: {
          not: "CLOSED",
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching vendor support tickets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
