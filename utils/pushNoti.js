import admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Firebase app instances
let vendorApp = null;
let userApp = null;
let deliveryApp = null;

// Initialize Firebase apps only if service account files exist
try {
    const vendorServiceAccountPath = path.join(process.cwd(), "rootmitvendor-firebase-adminsdk-fbsvc-c293314932.json");
    const userServiceAccountPath = path.join(process.cwd(), "rootmituser-firebase-adminsdk-fbsvc-2b9c6ac052.json");
    const deliveryServiceAccountPath = path.join(process.cwd(), "rootmitdelivery-firebase-adminsdk-fbsvc-c293314932.json");

    // Initialize vendor app if service account file exists
    if (fs.existsSync(vendorServiceAccountPath)) {
        const serviceAccountVendor = require(vendorServiceAccountPath);
        vendorApp = admin.initializeApp(
            { credential: admin.credential.cert(serviceAccountVendor) },
            "vendorApp"
        );
        console.log("✅ Firebase Vendor app initialized");
    } else {
        console.warn("⚠️  Firebase Vendor service account file not found");
    }

    // Initialize user app if service account file exists
    if (fs.existsSync(userServiceAccountPath)) {
        const serviceAccountUser = require(userServiceAccountPath);
        userApp = admin.initializeApp(
            { credential: admin.credential.cert(serviceAccountUser) },
            "userApp"
        );
        console.log("✅ Firebase User app initialized");
    } else {
        console.warn("⚠️  Firebase User service account file not found");
    }

    // Initialize delivery app if service account file exists
    if (fs.existsSync(deliveryServiceAccountPath)) {
        const serviceAccountDelivery = require(deliveryServiceAccountPath);
        deliveryApp = admin.initializeApp(
            { credential: admin.credential.cert(serviceAccountDelivery) },
            "deliveryApp"
        );
        console.log("✅ Firebase Delivery app initialized");
    } else {
        console.warn("⚠️  Firebase Delivery service account file not found");
    }
} catch (error) {
    console.error("🔥 Error initializing Firebase apps:", error.message);
}

/**
 * Generic function to send notifications
 * @param {Object} params
 * @param {number|number[]} params.ids - Single ID or array of IDs
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body
 * @param {string} params.type - "user" | "vendor" | "delivery"
 * @param {Object} params.firebaseApp - Firebase app instance
 * @param {string} params.table - Prisma model name ("user", "vendor", "deliveryPartner")
 * @param {Object} [params.data] - Additional data payload for the notification
 */
const sendNotification = async ({ ids, title, message, type, firebaseApp, table, data = {} }) => {
    try {
        // Check if Firebase app is initialized
        if (!firebaseApp) {
            return {
                success: false,
                message: `Firebase app for ${type} not initialized. Check service account files.`
            };
        }

        const normalizedIds = Array.isArray(ids) ? ids : [ids];

        // Fetch tokens dynamically from respective table
        const records = await prisma[table].findMany({
            where: {
                id: { in: normalizedIds },
                fcmToken: { not: null },
            },
            select: { id: true, fcmToken: true },
        });

        if (records.length === 0) {
            return { success: false, message: `No ${type}s found with valid FCM tokens` };
        }

        const tokens = records.map(r => r.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            return { success: false, message: `No valid FCM tokens found for ${type}` };
        }

        // Send multicast notification
        const response = await firebaseApp.messaging().sendMulticast({
            tokens,
            notification: {
                title,
                body: message
            },
            data: data
        });

        console.log(`✅ Sent ${type} notification → Success: ${response.successCount}, Failed: ${response.failureCount}`);

        // Handle failed tokens
        const failedTokens = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`❌ Failed ${type} token ${tokens[idx]}:`, resp.error);
                    // Check if the error is due to invalid token
                    if (resp.error.code === 'messaging/invalid-registration-token' ||
                        resp.error.code === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });

            // Remove invalid tokens from database
            if (failedTokens.length > 0) {
                await removeInvalidTokens(table, failedTokens);
                console.log(`🧹 Cleaned up ${failedTokens.length} invalid FCM tokens from ${table}`);
            }
        }

        return {
            success: true,
            message: `${type} notification sent`,
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
    } catch (error) {
        console.error(`🔥 Error sending ${type} notification:`, error);
        return { success: false, message: `Failed to send ${type} notification`, error: error.message };
    }
};

/**
 * Remove invalid FCM tokens from database
 * @param {string} table - Prisma model name
 * @param {string[]} tokens - Array of invalid tokens to remove
 */
const removeInvalidTokens = async (table, tokens) => {
    try {
        // For each invalid token, set fcmToken to null in the database
        for (const token of tokens) {
            await prisma[table].updateMany({
                where: { fcmToken: token },
                data: { fcmToken: null }
            });
        }
    } catch (error) {
        console.error(`🔥 Error removing invalid tokens from ${table}:`, error);
    }
};

/**
 * Send notification to multiple user types
 * @param {Object} params
 * @param {Object} params.targets - Object with user types as keys and IDs as values
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body
 * @param {Object} [params.data] - Additional data payload
 */
export const sendMultiTypeNotification = async ({ targets, title, message, data = {} }) => {
    try {
        const results = [];

        // Send to users
        if (targets.users && userApp) {
            const result = await sendNotification({
                ids: targets.users,
                title,
                message,
                type: "user",
                firebaseApp: userApp,
                table: "user",
                data
            });
            results.push({ type: "user", result });
        }

        // Send to vendors
        if (targets.vendors && vendorApp) {
            const result = await sendNotification({
                ids: targets.vendors,
                title,
                message,
                type: "vendor",
                firebaseApp: vendorApp,
                table: "vendor",
                data
            });
            results.push({ type: "vendor", result });
        }

        // Send to delivery partners
        if (targets.deliveryPartners && deliveryApp) {
            const result = await sendNotification({
                ids: targets.deliveryPartners,
                title,
                message,
                type: "delivery",
                firebaseApp: deliveryApp,
                table: "deliveryPartner",
                data
            });
            results.push({ type: "delivery", result });
        }

        return {
            success: true,
            message: "Notifications sent to all targets",
            results
        };
    } catch (error) {
        console.error("🔥 Error sending multi-type notification:", error);
        return { success: false, message: "Failed to send multi-type notification", error: error.message };
    }
};

// Specific wrappers for each type
export const sendVendorNotification = (ids, title, message, data = {}) =>
    sendNotification({ ids, title, message, type: "vendor", firebaseApp: vendorApp, table: "vendor", data });

export const sendUserNotification = (ids, title, message, data = {}) =>
    sendNotification({ ids, title, message, type: "user", firebaseApp: userApp, table: "user", data });

export const sendDeliveryNotification = (ids, title, message, data = {}) =>
    sendNotification({ ids, title, message, type: "delivery", firebaseApp: deliveryApp, table: "deliveryPartner", data });

// Export app status for debugging
export const getFirebaseAppStatus = () => ({
    vendorApp: !!vendorApp,
    userApp: !!userApp,
    deliveryApp: !!deliveryApp
});