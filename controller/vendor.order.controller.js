import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get all orders for vendor
 * @route GET /vendor/orders
 * @access Vendor
 */
export const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user.id; // Assuming vendor auth middleware sets req.user
    const {
      page = 1,
      limit = 10,
      status,
      orderType,
      startDate,
      endDate,
      searchTerm,
    } = req.query;

    const whereClause = { vendorId: vendorId };

    if (status) whereClause.status = status;
    if (orderType) whereClause.orderType = orderType;

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Search functionality
    if (searchTerm) {
      whereClause.OR = [
        { user: { name: { contains: searchTerm } } },
        { user: { phoneNumber: { contains: searchTerm } } },
        { deliveryAddress: { contains: searchTerm } },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profileImage: true,
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
            meal: {
              select: {
                id: true,
                title: true,
                image: true,
                type: true,
                isVeg: true,
              },
            },
            selectedOptions: true,
          },
        },
        mealSchedules: {
          include: {
            deliveryPartner: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: { scheduledDate: "asc" },
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

    const totalOrders = await prisma.order.count({ where: whereClause });

    // Calculate vendor statistics
    const orderStats = await prisma.order.groupBy({
      by: ["status"],
      where: whereClause,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const statsFormatted = orderStats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: stat._count.id,
        totalAmount: stat._sum.totalAmount || 0,
      };
      return acc;
    }, {});

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
        statistics: {
          totalOrders,
          statusBreakdown: statsFormatted,
          totalRevenue: orderStats.reduce(
            (sum, stat) => sum + (stat._sum.totalAmount || 0),
            0
          ),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching vendor orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get order details by ID for vendor
 * @route GET /vendor/orders/:orderId
 * @access Vendor
 */
export const getVendorOrderById = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
        vendorId: vendorId, // Ensure vendor can only see their orders
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profileImage: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profileImage: true,
            latitude: true,
            longitude: true,
          },
        },
        orderItems: {
          include: {
            meal: {
              select: {
                id: true,
                title: true,
                description: true,
                image: true,
                type: true,
                cuisine: true,
                isVeg: true,
                basePrice: true,
              },
            },
            selectedOptions: true,
          },
        },
        mealSchedules: {
          include: {
            deliveryPartner: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
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
    console.error("Error fetching vendor order details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Update order status by vendor
 * @route PATCH /vendor/orders/:orderId/status
 * @access Vendor
 */
export const updateVendorOrderStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { orderId } = req.params;
    const { status, notes } = req.body;

    // Vendors can only update certain statuses
    const allowedStatuses = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status for vendor",
        allowedStatuses,
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
        vendorId: vendorId,
      },
      select: { id: true, status: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        status,
        ...(notes && { orderNotes: notes }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        mealSchedules: {
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            mealType: true,
          },
        },
      },
    });

    // If order is confirmed, update related schedules
    if (status === "CONFIRMED") {
      await prisma.mealSchedule.updateMany({
        where: {
          orderId: Number(orderId),
          status: "SCHEDULED",
        },
        data: { status: "CONFIRMED" },
      });
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating vendor order status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get vendor dashboard statistics
 * @route GET /vendor/dashboard-stats
 * @access Vendor
 */
export const getVendorDashboardStats = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Today's schedule statistics
    const todaySchedules = await prisma.mealSchedule.groupBy({
      by: ["status"],
      where: {
        vendorId: vendorId,
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      _count: { id: true },
    });

    const totalTodaySchedules = await prisma.mealSchedule.count({
      where: {
        vendorId: vendorId,
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    // Monthly statistics
    const monthStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const monthlyOrders = await prisma.order.groupBy({
      by: ["status"],
      where: {
        vendorId: vendorId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const totalMonthlyRevenue = await prisma.order.aggregate({
      where: {
        vendorId: vendorId,
        status: "DELIVERED",
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: { totalAmount: true },
    });

    // Pending schedules count
    const pendingSchedules = await prisma.mealSchedule.count({
      where: {
        vendorId: vendorId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        scheduledDate: { gte: targetDate },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        today: {
          date: targetDate.toISOString().split("T")[0],
          totalSchedules: totalTodaySchedules,
          scheduleBreakdown: todaySchedules.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
          completionRate:
            totalTodaySchedules > 0
              ? (
                  ((todaySchedules.find((s) => s.status === "DELIVERED")?._count
                    .id || 0) /
                    totalTodaySchedules) *
                  100
                ).toFixed(2)
              : 0,
        },
        monthly: {
          totalOrders: monthlyOrders.reduce(
            (sum, stat) => sum + stat._count.id,
            0
          ),
          totalRevenue: totalMonthlyRevenue._sum.totalAmount || 0,
          orderBreakdown: monthlyOrders.reduce((acc, stat) => {
            acc[stat.status] = {
              count: stat._count.id,
              revenue: stat._sum.totalAmount || 0,
            };
            return acc;
          }, {}),
        },
        pending: {
          pendingSchedules,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching vendor dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
