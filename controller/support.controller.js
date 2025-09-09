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
    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        role,
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

export const sendMessageToSupportTicket = async (req, res) => {

  const { id: senderId, role: senderRole } = req.user;
  
  console.log(senderId, senderRole);

  const { ticketId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  try {
    // Validate ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parseInt(ticketId) },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Support ticket not found." });
    }

    // Optional: check if sender is allowed to message this ticket
    const isSenderOwner = ticket.userId === senderId && ticket.role === senderRole;
    const isAdmin = senderRole === 'ADMIN';

    if (!isSenderOwner && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to send message to this ticket." });
    }

    // Create new message
    const newMessage = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId,
        senderRole,
        message: message.trim(),
      },
    });

    return res.status(201).json({
      message: "Message sent successfully.",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error sending support message:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

//status update close /open 


export const updateSupportTicketStatus = async (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;

  if (!status || !["OPEN", "CLOSED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Allowed values are OPEN or CLOSED." });
  }

  try {
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: parseInt(ticketId) },
      data: { status },
    });

    return res.status(200).json({
      message: "Support ticket status updated successfully.",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error updating support ticket status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

