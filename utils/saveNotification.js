import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Save a notification for a user or role
 * 
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {number} [options.userId] - Target user ID (optional)
 * @param {string} [options.role] - Target role (e.g., "ADMIN", "VENDOR", "USER")
 */
export const saveNotification = async ({ title, message, userId = null, role = null }) => {
  try {
    if (!title || !message) {
      throw new Error("Title and message are required for notifications");
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        userId,
        role,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error saving notification:", error);
    throw error;
  }
};
