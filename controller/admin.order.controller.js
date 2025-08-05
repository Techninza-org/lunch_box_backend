import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get all orders for admin with comprehensive details
 * @route GET /admin/orders
 * @access Admin
 */
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      orderType,
      vendorId,
      startDate,
      endDate,
      searchTerm,
    } = req.query;

    const whereClause = {};

    if (status) whereClause.status = status;
    if (orderType) whereClause.orderType = orderType;
    if (vendorId) whereClause.vendorId = Number(vendorId);

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
        { user: { email: { contains: searchTerm } } },
        { user: { phoneNumber: { contains: searchTerm } } },
        { vendor: { businessName: { contains: searchTerm } } },
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
            email: true,
            phoneNumber: true,
            profileImage: true,
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
            city: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profileImage: true,
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
                cuisine: true,
                isVeg: true,
              },
            },
            selectedOptions: true,
          },
        },
        mealSchedules: {
          include: {
            vendor: {
              select: {
                id: true,
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

    // Calculate summary statistics
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
    console.error("Error fetching orders for admin:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get order details by ID for admin
 * @route GET /admin/orders/:orderId
 * @access Admin
 */
export const getOrderByIdAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profileImage: true,
            isActive: true,
            isVerified: true,
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
            city: true,
            state: true,
            latitude: true,
            longitude: true,
            isActive: true,
            status: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profileImage: true,
            isActive: true,
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
                isAvailable: true,
              },
            },
            selectedOptions: true,
          },
        },
        mealSchedules: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                businessName: true,
                phoneNumber: true,
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
    console.error("Error fetching order details for admin:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Update order status by admin
 * @route PATCH /admin/orders/:orderId/status
 * @access Admin
 */
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
        validStatuses,
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
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
            email: true,
            phoneNumber: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Assign delivery partner to order/schedule by admin
 * @route PATCH /admin/orders/:orderId/assign-delivery-partner
 * @access Admin
 */
export const assignDeliveryPartnerAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryPartnerId, scheduleId } = req.body;

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

    if (scheduleId) {
      // Assign to specific schedule
      const schedule = await prisma.mealSchedule.update({
        where: {
          id: Number(scheduleId),
          orderId: Number(orderId),
        },
        data: {
          deliveryPartnerId: Number(deliveryPartnerId),
          status: "PREPARED",
        },
        include: {
          order: {
            select: {
              id: true,
              user: { select: { name: true, phoneNumber: true } },
            },
          },
          vendor: {
            select: { name: true, businessName: true },
          },
          deliveryPartner: {
            select: { id: true, name: true, phoneNumber: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Delivery partner assigned to schedule successfully",
        data: schedule,
      });
    } else {
      // Assign to order and update all related schedules
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: Number(orderId) },
          data: { deliveryPartnerId: Number(deliveryPartnerId) },
        });

        await tx.mealSchedule.updateMany({
          where: {
            orderId: Number(orderId),
            status: { in: ["SCHEDULED", "PREPARED"] },
          },
          data: {
            deliveryPartnerId: Number(deliveryPartnerId),
            status: "PREPARED",
          },
        });
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id: Number(orderId) },
        include: {
          deliveryPartner: {
            select: { id: true, name: true, phoneNumber: true },
          },
          mealSchedules: {
            where: { deliveryPartnerId: Number(deliveryPartnerId) },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Delivery partner assigned to order successfully",
        data: updatedOrder,
      });
    }
  } catch (error) {
    console.error("Error assigning delivery partner:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get dashboard statistics for admin
 * @route GET /admin/dashboard-stats
 * @access Admin
 */
export const getAdminDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {};

    // Order statistics
    const orderStats = await prisma.order.groupBy({
      by: ["status"],
      where: dateFilter,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const totalOrders = await prisma.order.count({ where: dateFilter });
    const totalRevenue = await prisma.order.aggregate({
      where: { ...dateFilter, status: "DELIVERED" },
      _sum: { totalAmount: true },
    });

    // Vendor statistics
    const totalVendors = await prisma.vendor.count({
      where: { isActive: true },
    });
    const totalUsers = await prisma.user.count({ where: { isActive: true } });
    const totalDeliveryPartners = await prisma.deliveryPartner.count({
      where: { isActive: true },
    });

    // Schedule statistics
    const scheduleStats = await prisma.mealSchedule.groupBy({
      by: ["status"],
      where:
        startDate && endDate
          ? {
              scheduledDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {},
      _count: { id: true },
    });

    res.status(200).json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          revenue: totalRevenue._sum.totalAmount || 0,
          statusBreakdown: orderStats.reduce((acc, stat) => {
            acc[stat.status] = {
              count: stat._count.id,
              revenue: stat._sum.totalAmount || 0,
            };
            return acc;
          }, {}),
        },
        users: {
          totalUsers,
          totalVendors,
          totalDeliveryPartners,
        },
        schedules: {
          statusBreakdown: scheduleStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
