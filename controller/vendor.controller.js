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
    return res
      .status(401)
      .json({ message: "Unauthorized or invalid vendor ID" });
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
    return res
      .status(401)
      .json({ message: "Unauthorized or invalid vendor ID" });
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
      message: `Vendor is now ${
        updatedVendor.isActive ? "active" : "inactive"
      }`,
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
    return res
      .status(401)
      .json({ message: "Unauthorized or invalid vendor ID" });
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
    return res
      .status(401)
      .json({ message: "Unauthorized or invalid vendor ID" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: vendorId }, { role: "VENDOR" }],
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
    const [totalOrders, pending, confirmed, completed, cancelled, totalMeals] =
      await Promise.all([
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
      return res
        .status(403)
        .json({
          error: "Access denied. Only vendors can access this endpoint.",
        });
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
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching vendor support tickets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// vendor stats
export const getVendorStats = async (req, res) => {
  try {
    const vendorId = req.user?.id;

    if (!vendorId) {
      return res.status(401).json({ error: "Unauthorized: Vendor ID missing" });
    }

    // Parallel base stats
    const [
      totalMeals,
      totalOrders,
      revenueAgg,
      pendingCount,
      cancelledCount,
      completedForTiming,
      cancelledForTiming,
    ] = await Promise.all([
      prisma.meal.count({ where: { vendorId } }),
      prisma.order.count({ where: { vendorId } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { vendorId, status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      prisma.order.count({ where: { vendorId, status: "PENDING" } }),
      prisma.order.count({ where: { vendorId, status: "CANCELLED" } }),
      prisma.order.findMany({
        where: { vendorId, status: "COMPLETED" },
        select: { createdAt: true, updatedAt: true },
      }),
      prisma.order.findMany({
        where: { vendorId, status: "CANCELLED" },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    // Compute average completion time (minutes)
    const avgCompletionTimeMinutes = completedForTiming.length
      ? +(
          completedForTiming.reduce(
            (sum, o) => sum + (o.updatedAt - o.createdAt) / 60000,
            0
          ) / completedForTiming.length
        ).toFixed(2)
      : 0;
    const avgCancellationTimeMinutes = cancelledForTiming.length
      ? +(
          cancelledForTiming.reduce(
            (sum, o) => sum + (o.updatedAt - o.createdAt) / 60000,
            0
          ) / cancelledForTiming.length
        ).toFixed(2)
      : 0;

    return res.status(200).json({
      totalMeals,
      totalOrders,
      totalRevenue: revenueAgg._sum.totalAmount || 0,
      pendingOrders: pendingCount,
      cancelledOrders: cancelledCount,
      avgCompletionTimeMinutes,
      avgCancellationTimeMinutes,
    });
  } catch (error) {
    console.error("Error getting vendor stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Detailed dashboard style stats (sales, menu, operations, customers, complaints)
export const getVendorPerformanceStats = async (req, res) => {
  try {
    const vendorId = req.user?.id;
    if (!vendorId)
      return res.status(401).json({ error: "Unauthorized: Vendor ID missing" });

    // Date filters (optionally pass ?from=YYYY-MM-DD&to=YYYY-MM-DD)
    const { from, to } = req.query;
    let dateFilter = {};
    if (from || to) {
      dateFilter = {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to + "T23:59:59") : undefined,
      };
    }

    // Parallel queries
    const [
      meals, // all meals for menu score calculations
      ordersAll,
      ordersCompleted,
      ordersCancelled,
      uniqueCustomerIds,
      deliveredSchedules,
      vendorTickets,
    ] = await Promise.all([
      prisma.meal.findMany({ where: { vendorId, isDeleted: false } }),
      prisma.order.findMany({
        where: { vendorId, createdAt: dateFilter },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          userId: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { vendorId, status: "COMPLETED", createdAt: dateFilter },
        select: { id: true, totalAmount: true },
      }),
      prisma.order.findMany({
        where: { vendorId, status: "CANCELLED", createdAt: dateFilter },
        select: { id: true, totalAmount: true },
      }),
      prisma.order.findMany({ where: { vendorId }, select: { userId: true } }),
      prisma.mealSchedule.findMany({
        where: {
          vendorId,
          status: "DELIVERED",
          ...(from || to ? { scheduledDate: dateFilter } : {}),
          actualDeliveryTime: { not: null },
        },
        select: { createdAt: true, actualDeliveryTime: true },
      }),
      prisma.supportTicket.findMany({
        where: {
          userId: vendorId,
          role: "VENDOR",
          ...(from || to ? { createdAt: dateFilter } : {}),
        },
        select: { status: true },
      }),
    ]);

    // Menu metrics
    const totalMeals = meals.length;
    const mealsWithImages = meals.filter((m) => !!m.image).length;
    const mealsWithDescription = meals.filter(
      (m) => !!m.description && m.description.trim().length >= 10
    ).length;
    const vegMeals = meals.filter((m) => m.isVeg).length;
    const nonVegMeals = totalMeals - vegMeals;
    const customizableMeals = meals.filter(
      (m) => m.configType === "CUSTOMIZABLE"
    ).length; //done

    // Menu scoring heuristic (adjust later): weights for photo(25) + description(25) + variety(25) + customization(25)
    const photoScore = totalMeals ? (mealsWithImages / totalMeals) * 25 : 0;
    const descScore = totalMeals ? (mealsWithDescription / totalMeals) * 25 : 0;
    const varietyScore = totalMeals
      ? (Math.min(vegMeals, nonVegMeals) / totalMeals) * 25 * 2
      : 0; // encourages balance
    const customizationScore = totalMeals
      ? (customizableMeals / totalMeals) * 25
      : 0;
    const menuScore = Math.round(
      photoScore + descScore + varietyScore + customizationScore
    ); //--done

    // Sales metrics
    const grossSales = ordersCompleted.reduce(
      (s, o) => s + (o.totalAmount || 0),
      0
    );
    const cancelledOrdersLoss = ordersCancelled.reduce(
      (s, o) => s + (o.totalAmount || 0),
      0
    );
    const completedOrders = ordersCompleted.length;
    const grossAOV = completedOrders ? grossSales / completedOrders : 0;

    // Order status counts derived from ordersAll
    const pendingOrders = ordersAll.filter(
      (o) => o.status === "PENDING"
    ).length;
    const confirmedOrders = ordersAll.filter(
      (o) => o.status === "CONFIRMED"
    ).length;
    const cancelledOrders = ordersCancelled.length; // explicit
    const totalOrders = ordersAll.length;

    const completionRatePct = totalOrders
      ? +((completedOrders / totalOrders) * 100).toFixed(2)
      : 0;
    const cancellationRatePct = totalOrders
      ? +((cancelledOrders / totalOrders) * 100).toFixed(2)
      : 0;

    // Average completion / cancellation times (minutes)
    const avgCompletionTimeMinutes = completedOrders
      ? +(
          ordersCompleted.reduce(
            (sum, o) => sum + (o.updatedAt - o.createdAt) / 60000,
            0
          ) / completedOrders
        ).toFixed(2)
      : 0;
    const avgCancellationTimeMinutes = cancelledOrders
      ? +(
          ordersCancelled.reduce(
            (sum, o) => sum + (o.updatedAt - o.createdAt) / 60000,
            0
          ) / cancelledOrders
        ).toFixed(2)
      : 0;

    // Prep time calculations based on MEAL SCHEDULES (DELIVERED)
    let avgPrepTimeMin = 0;
    let fastPrepOrders = 0; // <6 min
    let delayedOrders = 0; // >5 min
    if (deliveredSchedules.length) {
      const prepTimes = deliveredSchedules
        .map(
          (s) =>
            (new Date(s.actualDeliveryTime).getTime() -
              new Date(s.createdAt).getTime()) /
            60000
        )
        .filter((t) => t >= 0);
      if (prepTimes.length) {
        const totalPrep = prepTimes.reduce((a, b) => a + b, 0);
        avgPrepTimeMin = totalPrep / prepTimes.length;
        fastPrepOrders = prepTimes.filter((t) => t < 6).length;
        delayedOrders = prepTimes.filter((t) => t > 5).length;
      }
    }

    // Customer metrics
    const uniqueCustomers = new Set(uniqueCustomerIds.map((o) => o.userId));
    // For repeat vs new we would normally need first-order date per user; placeholder segmentation
    const repeatCustomers = 0; // requires historical query
    const newCustomers = uniqueCustomers.size; // simplification

    // Operations metrics (placeholders until schedule / timing tracking implemented)
    // const onlineAvailabilityPct = 100; // assume always online when generating
    // const kitchenPrepTimeMin = 0; // need prep time tracking to compute
    // const delayedOrdersPct = 0; // need delivery time vs promised tracking
    // const foodReadyAccuracyPct = 0; // need ready time vs scheduled

    // Complaints metrics derived from SupportTicket entries (treating tickets as complaints)
    const totalComplaints = vendorTickets.length;
    const openComplaints = vendorTickets.filter(
      (t) => t.status === "OPEN"
    ).length;
    const inProgressComplaints = vendorTickets.filter(
      (t) => t.status === "IN_PROGRESS"
    ).length;
    const resolvedComplaints = vendorTickets.filter(
      (t) => t.status === "RESOLVED"
    ).length;
    const closedComplaints = vendorTickets.filter(
      (t) => t.status === "CLOSED"
    ).length;
    const unresolvedComplaints = openComplaints + inProgressComplaints; // not yet resolved/closed
    const complaintsPct = ordersAll.length
      ? +((totalComplaints / ordersAll.length) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      dateRange: { from: from || null, to: to || null },
      menu: {
        score: menuScore,
        itemsWithPhotosPct: totalMeals
          ? +((mealsWithImages / totalMeals) * 100).toFixed(2)
          : 0,
        itemsWithDescriptionsPct: totalMeals
          ? +((mealsWithDescription / totalMeals) * 100).toFixed(2)
          : 0,
        customizableMeals,
        vegMeals,
        nonVegMeals,
        totalMeals,
      },
      sales: {
        grossSales: +grossSales.toFixed(2),
        totalOrders,
        pendingOrders,
        confirmedOrders,
        completedOrders,
        cancelledOrders,
        completionRatePct,
        cancellationRatePct,
        cancelledOrderLoss: +cancelledOrdersLoss.toFixed(2),
        grossAOV: +grossAOV.toFixed(2),
        avgCompletionTimeMinutes,
        avgCancellationTimeMinutes,
      },
      customers: {
        newCustomers,
        repeatCustomers,
        repeatCustomerOrderPct:
          repeatCustomers && ordersAll.length
            ? +((repeatCustomers / ordersAll.length) * 100).toFixed(2)
            : 0,
        dormantCustomers: 0,
        newCustomerOrderPct:
          newCustomers && ordersAll.length
            ? +((newCustomers / ordersAll.length) * 100).toFixed(2)
            : 0,
        dormantCustomerOrderPct: 0,
      },
      // operations: {
      //   onlineAvailabilityPct,
      //   // replaced placeholder with actual average where possible
      //   kitchenPrepTimeMin: +avgPrepTimeMin.toFixed(2),
      //   foodReadyAccuracyPct,
      //   delayedOrdersPct: deliveredSchedules.length
      //     ? +((delayedOrders / deliveredSchedules.length) * 100).toFixed(2)
      //     : 0,
      // },
      complaints: {
        totalComplaints,
        complaintsPct,
        ordersWithComplaints: totalComplaints, // assumption: each ticket maps to max one order
        open: openComplaints,
        inProgress: inProgressComplaints,
        resolved: resolvedComplaints,
        closed: closedComplaints,
        unresolvedComplaints,
        customerRefundedComplaints: 0, // refund linkage not implemented
        nonRefundedComplaints: 0,
      },
      // Added explicit order (bolt) style stats section
      orders: {
        total: totalOrders,
        completed: completedOrders,
        fastOrders: fastPrepOrders,
        fastOrdersPct: deliveredSchedules.length
          ? +((fastPrepOrders / deliveredSchedules.length) * 100).toFixed(2)
          : 0,
        aov: +grossAOV.toFixed(2),
        avgPrepTimeMin: +avgPrepTimeMin.toFixed(2),
        ordersUnder6MinPct: deliveredSchedules.length
          ? +((fastPrepOrders / deliveredSchedules.length) * 100).toFixed(2)
          : 0,
        delayedOrders,
        delayedOrdersPct: deliveredSchedules.length
          ? +((delayedOrders / deliveredSchedules.length) * 100).toFixed(2)
          : 0,
        pending: pendingOrders,
        confirmed: confirmedOrders,
        cancelled: cancelledOrders,
        completionRatePct,
        cancellationRatePct,
        avgCompletionTimeMinutes,
        avgCancellationTimeMinutes,
      },
    });
  } catch (error) {
    console.error("Error getting vendor performance stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
