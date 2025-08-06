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