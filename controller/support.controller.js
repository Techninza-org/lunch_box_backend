import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { saveNotification } from "../utils/saveNotification.js";


export const createSupportTicket = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized: Missing user ID or role" });
    }

    const { subject, message, type = "GENERAL" } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        role,
        subject,
        type: type,
        status: "OPEN",
        messages: {
          create: {
            senderRole: role,
            senderId: userId,
            message,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return res.status(201).json({
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getSupportTickets = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    // console.log(`Fetching support tickets for userId: ${userId}, role: ${role}`);

    // if (!userId || role !== "VENDOR") {
    //   return res.status(403).json({ error: "Access denied. Only vendors can access this endpoint." });
    // }

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
    console.error(`Error fetching ${role} support tickets:`, error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
