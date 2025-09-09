import admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";

const serviceAccount = require("../rootmit-vendor-firebase-adminsdk-fbsvc-c293314932.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const prisma = new PrismaClient();

/**
 * Send push notification to vendor(s)
 * @param {number|number[]} vendorIds - Single vendor ID or array of vendor IDs
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Promise<Object>} Result of notification sending
 */
export const sendVendorNotification = async (vendorIds, title, message) => {
    try {
        // Normalize vendorIds to array
        const ids = Array.isArray(vendorIds) ? vendorIds : [vendorIds];

        // Fetch vendors with their FCM tokens
        const vendors = await prisma.vendor.findMany({
            where: {
                id: { in: ids },
                fcmToken: { not: null }
            },
            select: {
                id: true,
                fcmToken: true
            }
        });

        if (vendors.length === 0) {
            return { success: false, message: "No vendors found with valid FCM tokens" };
        }

        // Extract valid FCM tokens
        const tokens = vendors
            .map(vendor => vendor.fcmToken)
            .filter(token => token !== null);

        if (tokens.length === 0) {
            return { success: false, message: "No valid FCM tokens found" };
        }

        // Prepare notification payload
        const payload = {
            notification: {
                title: title,
                body: message
            }
        };

        // Send multicast message
        const response = await admin.messaging().sendMulticast({
            tokens: tokens,
            ...payload
        });

        // Log results
        console.log(`Successfully sent notification to ${response.successCount} vendors`);

        if (response.failureCount > 0) {
            console.error(`Failed to send notification to ${response.failureCount} vendors`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
                }
            });
        }

        return {
            success: true,
            message: `Notification sent successfully to ${response.successCount} vendors`,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    } catch (error) {
        console.error("Error sending vendor notification:", error);
        return { success: false, message: "Failed to send notification", error: error.message };
    }
};