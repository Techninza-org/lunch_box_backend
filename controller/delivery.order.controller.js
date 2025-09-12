import { PrismaClient } from "@prisma/client";
import { sendUserNotification, sendVendorNotification } from "../utils/pushNoti.js";

const prisma = new PrismaClient();

/**
 * Get all assigned meal schedules for delivery partner
 * @route GET /delivery-partner/schedules
 * @access DeliveryPartner
 */
export const getDeliveryPartnerSchedules = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.id; // Assuming delivery partner auth middleware sets req.user
    const {
      page = 1,
      limit = 10,
      status,
      mealType,
    } = req.query;

    const whereClause = { deliveryPartnerId: deliveryPartnerId };

    if (status) whereClause.status = status;
    if (mealType) whereClause.mealType = mealType;

    const schedules = await prisma.mealSchedule.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderType: true,
            totalAmount: true,
            paymentType: true,
            paymentStatus: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryState: true,
            deliveryZipCode: true,
            deliveryPhone: true,
            deliveryLat: true,
            deliveryLng: true,
            orderNotes: true,
            deliveryChargeperUnit: true,
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                profileImage: true,
                longitude: true,
                latitude: true,
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
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTimeSlot: "asc" }],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const totalSchedules = await prisma.mealSchedule.count({
      where: whereClause,
    });

    // Calculate delivery statistics
    const scheduleStats = await prisma.mealSchedule.groupBy({
      by: ["status"],
      where: whereClause,
      _count: { id: true },
    });

    const statsFormatted = scheduleStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        schedules,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalSchedules / Number(limit)),
          totalSchedules,
          hasNextPage: Number(page) * Number(limit) < totalSchedules,
          hasPrevPage: Number(page) > 1,
        },
        statistics: {
          totalSchedules,
          statusBreakdown: statsFormatted,
          completionRate:
            totalSchedules > 0
              ? (
                ((statsFormatted.DELIVERED || 0) / totalSchedules) *
                100
              ).toFixed(2)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching delivery partner schedules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get schedule details by ID for delivery partner
 * @route GET /delivery-partner/schedules/:scheduleId
 * @access DeliveryPartner
 */
export const getScheduleByIdDeliveryPartner = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.id;
    const { scheduleId } = req.params;

    const schedule = await prisma.mealSchedule.findUnique({
      where: {
        id: Number(scheduleId),
        deliveryPartnerId: deliveryPartnerId, // Ensure delivery partner can only see assigned schedules
      },
      include: {
        order: {
          select: {
            id: true,
            orderType: true,
            totalAmount: true,
            subtotal: true,
            deliveryCharges: true,
            taxes: true,
            paymentType: true,
            paymentStatus: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryState: true,
            deliveryZipCode: true,
            deliveryPhone: true,
            deliveryLat: true,
            deliveryLng: true,
            deliveryChargeperUnit: true,
            orderNotes: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                profileImage: true,
                longitude: true,
                latitude: true,
              },
            },
            orderItems: {
              select: {
                id: true,
                mealTitle: true,
                mealImage: true,
                mealType: true,
                isVeg: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                selectedOptions: true,
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
            state: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found or not assigned to you",
      });
    }

    res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error(
      "Error fetching schedule details for delivery partner:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Update schedule status by delivery partner
 * @route PATCH /delivery-partner/schedules/:scheduleId/status
 * @access DeliveryPartner
 */
export const updateScheduleStatusDeliveryPartner = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.id;
    const { scheduleId } = req.params;
    const {
      status,
      notes,
      latitude,
      longitude
    } = req.body;

    // Delivery partners can only update certain statuses
    const allowedStatuses = ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "MISSED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status for delivery partner",
        allowedStatuses,
      });
    }

    const schedule = await prisma.mealSchedule.findUnique({
      where: {
        id: Number(scheduleId),
        deliveryPartnerId: deliveryPartnerId,
      },
      select: { id: true, status: true, orderId: true },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found or not assigned to you",
      });
    }

    // Validate status transitions
    const validTransitions = {
      PARTNER_ASSIGNED: ["PICKED_UP", "CANCELLED"],
      PREPARED: ["PICKED_UP"],
      PICKED_UP: ["OUT_FOR_DELIVERY"],
      OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
    };

    if (!validTransitions[schedule.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${schedule.status} to ${status}`,
      });
    }

    const updateData = {
      status,
      notes,
    };

    // Add delivery timestamp and location for delivered status
    // if (status === "DELIVERED") {
    //   updateData.actualDeliveryTime = new Date();
    //   if (latitude && longitude) {
    //     updateData.deliveryLat = parseFloat(latitude);
    //     updateData.deliveryLng = parseFloat(longitude);
    //   }
    // }

    const updatedSchedule = await prisma.$transaction(async (tx) => {
      // Update schedule
      const schedule = await tx.mealSchedule.update({
        where: { id: Number(scheduleId) },
        data: updateData,
        include: {
          order: {
            select: {
              id: true,
              user: {
                select: { name: true, phoneNumber: true, id: true },
              },
              deliveryChargeperUnit: true,
              orderItems: {
                select: {
                  totalPrice: true,
                },
              },
            },
          },
          vendor: {
            select: {
              name: true,
              businessName: true,
              id: true,
            },
          },
        },
      });

      // If delivered, check if all schedules for this order are delivered
      if (status === "DELIVERED") {
        const pendingSchedules = await tx.mealSchedule.count({
          where: {
            orderId: schedule.orderId,
            status: { notIn: ["DELIVERED", "CANCELLED", "MISSED"] },
          },
        });

        // If no pending schedules, mark order as delivered
        if (pendingSchedules === 0) {
          await tx.order.update({
            where: { id: schedule.orderId },
            data: { status: "DELIVERED" },
          });
        }

        // Calculate total price from all order items
        const totalPrice = schedule.order.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

        // Get settings for commission calculations
        const setting = await tx.settings.findFirst();

        // Calculate commissions
        const vendorCommission = (totalPrice * (setting?.vendorCommission || 0)) / 100;
        const adminCommission = (totalPrice * (setting?.adminCommission || 0)) / 100;
        const deliveryPartnerCommission = parseFloat(schedule.order.deliveryChargeperUnit) || 0;
        console.log("totalPrice :", totalPrice, "vendorCommission :", vendorCommission, "adminCommission :", adminCommission, "deliveryPartnerCommission :", deliveryPartnerCommission);
        // Calculate vendor amount (total - vendor commission)
        const vendorAmount = totalPrice - vendorCommission;

        // Add money to vendor wallet
        // First, get or create vendor wallet
        let vendorWallet = await tx.vendorWallet.findUnique({
          where: { vendorId: schedule.vendor.id }
        });

        if (!vendorWallet) {
          vendorWallet = await tx.vendorWallet.create({
            data: {
              vendorId: schedule.vendor.id,
              balance: 0
            }
          });
        }

        // Update vendor wallet balance
        await tx.vendorWallet.update({
          where: { id: vendorWallet.id },
          data: { balance: { increment: vendorAmount } }
        });

        // Create vendor wallet transaction
        await tx.vendorWalletTransaction.create({
          data: {
            vendorId: schedule.vendor.id,
            vendorWalletId: vendorWallet.id,
            amount: vendorAmount,
            type: "CREDIT",
            description: `Order payment for order #${schedule.order.id}`
          }
        });

        // Add money to delivery partner wallet
        // First, get or create delivery partner wallet
        let deliveryWallet = await tx.deliveryWallet.findUnique({
          where: { deliveryId: deliveryPartnerId }
        });

        if (!deliveryWallet) {
          deliveryWallet = await tx.deliveryWallet.create({
            data: {
              deliveryId: deliveryPartnerId,
              balance: 0
            }
          });
        }

        // Update delivery wallet balance
        await tx.deliveryWallet.update({
          where: { id: deliveryWallet.id },
          data: { balance: { increment: deliveryPartnerCommission } }
        });

        // Create delivery wallet transaction
        await tx.deliveryWalletTransaction.create({
          data: {
            deliveryId: deliveryPartnerId,
            walletId: deliveryWallet.id,
            amount: deliveryPartnerCommission,
            type: "CREDIT",
            description: `Delivery commission for order #${schedule.order.id}`
          }
        });

        // Add money to admin wallet
        // First, get or create admin wallet
        let adminWallet = await tx.adminWallet.findFirst();

        if (!adminWallet) {
          // Get first admin to associate with the wallet
          const firstAdmin = await tx.admin.findFirst();
          if (firstAdmin) {
            adminWallet = await tx.adminWallet.create({
              data: {
                adminId: firstAdmin.id,
                balance: 0
              }
            });
          }
        }

        if (adminWallet) {
          // Update admin wallet balance
          await tx.adminWallet.update({
            where: { id: adminWallet.id },
            data: { balance: { increment: adminCommission } }
          });

          // Create admin wallet transaction
          await tx.adminWalletTransaction.create({
            data: {
              adminId: adminWallet.adminId,
              walletId: adminWallet.id,
              amount: adminCommission,
              type: "CREDIT",
              discription: `Admin commission for order #${schedule.order.id}` // Note: 'discription' is correct as per schema
            }
          });
        }
      }

      // Send push notifications to user and vendor for all status updates
      try {
        // Send notification to user
        if (schedule.order.user?.id) {
          await sendUserNotification(
            [schedule.order.user.id],
            `Order Status Updated`,
            `Your order #${schedule.order.id} status has been updated to ${status}.`,
            { orderId: schedule.order.id.toString(), status, type: "ORDER_STATUS_UPDATE" }
          );
        }

        // Send notification to vendor
        if (schedule.vendor?.id) {
          await sendVendorNotification(
            [schedule.vendor.id],
            `Order Status Updated`,
            `Order #${schedule.order.id} status has been updated to ${status}.`,
            { orderId: schedule.order.id.toString(), status, type: "ORDER_STATUS_UPDATE" }
          );
        }
      } catch (notificationError) {
        console.error("Error sending push notifications:", notificationError);
        // Don't fail the whole operation if notifications fail
      }

      return schedule;
    });

    res.status(200).json({
      success: true,
      message: "Schedule status updated successfully",
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("Error updating schedule status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get today's delivery schedules
 * @route GET /delivery-partner/schedules/today
 * @access DeliveryPartner
 */
export const getTodaySchedulesDeliveryPartner = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await prisma.mealSchedule.findMany({
      where: {
        deliveryPartnerId: deliveryPartnerId,
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryPhone: true,
            deliveryLat: true,
            deliveryLng: true,
            paymentType: true,
            totalAmount: true,
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
      orderBy: [{ scheduledTimeSlot: "asc" }, { mealType: "asc" }],
    });

    // Group by time slots for better organization
    const groupedSchedules = schedules.reduce((acc, schedule) => {
      const timeSlot = schedule.scheduledTimeSlot;
      if (!acc[timeSlot]) {
        acc[timeSlot] = [];
      }
      acc[timeSlot].push(schedule);
      return acc;
    }, {});

    const stats = await prisma.mealSchedule.groupBy({
      by: ["status"],
      where: {
        deliveryPartnerId: deliveryPartnerId,
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      _count: { id: true },
    });

    res.status(200).json({
      success: true,
      data: {
        date: today.toISOString().split("T")[0],
        schedules: groupedSchedules,
        totalSchedules: schedules.length,
        statistics: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Error fetching today's schedules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get delivery partner dashboard statistics
 * @route GET /delivery-partner/dashboard-stats
 * @access DeliveryPartner
 */
export const getDeliveryPartnerDashboardStats = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.id;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Today's statistics
    const todayStats = await prisma.mealSchedule.groupBy({
      by: ["status"],
      where: {
        deliveryPartnerId: deliveryPartnerId,
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      _count: { id: true },
    });

    const totalTodaySchedules = await prisma.mealSchedule.count({
      where: {
        deliveryPartnerId: deliveryPartnerId,
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    // Weekly statistics
    const weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyStats = await prisma.mealSchedule.groupBy({
      by: ["status"],
      where: {
        deliveryPartnerId: deliveryPartnerId,
        scheduledDate: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      _count: { id: true },
    });

    // Pending deliveries
    const pendingDeliveries = await prisma.mealSchedule.count({
      where: {
        deliveryPartnerId: deliveryPartnerId,
        status: { in: ["PREPARED", "OUT_FOR_DELIVERY"] },
        scheduledDate: { gte: targetDate },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        today: {
          date: targetDate.toISOString().split("T")[0],
          totalDeliveries: totalTodaySchedules,
          statusBreakdown: todayStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
          completionRate:
            totalTodaySchedules > 0
              ? (
                ((todayStats.find((s) => s.status === "DELIVERED")?._count
                  .id || 0) /
                  totalTodaySchedules) *
                100
              ).toFixed(2)
              : 0,
        },
        weekly: {
          totalDeliveries: weeklyStats.reduce(
            (sum, stat) => sum + stat._count.id,
            0
          ),
          statusBreakdown: weeklyStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
        },
        pending: {
          pendingDeliveries,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching delivery partner dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
