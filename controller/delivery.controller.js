import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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