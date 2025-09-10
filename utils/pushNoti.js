import admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Firebase app instances
let vendorApp = null;
let userApp = null;
let deliveryApp = null;

// Helper to safely load a JSON service account file
const loadServiceAccount = (filePath) => {
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, "utf8");
            return JSON.parse(content);
        } catch (err) {
            console.error(`🔥 Failed to parse service account file ${filePath}:`, err.message);
        }
    } else {
        console.warn(`⚠️  Service account file not found at ${filePath}`);
    }
    return null;
};

// Initialize Firebase apps only if service account files exist
try {
    const vendorServiceAccountPath = path.resolve("./rootmit-vendor-firebase-adminsdk-fbsvc-cdd5c5ac9a.json");
    const userServiceAccountPath = path.resolve("./rootmituser-firebase-adminsdk-fbsvc-2b9c6ac052.json");
    const deliveryServiceAccountPath = path.resolve("./rootmitdelivery-firebase-adminsdk-fbsvc-c293314932.json");

    const vendorCreds = loadServiceAccount(vendorServiceAccountPath);
    if (vendorCreds) {
        vendorApp = admin.initializeApp(
            { credential: admin.credential.cert(vendorCreds) },
            "vendorApp"
        );
        console.log("✅ Firebase Vendor app initialized");
    }

    const userCreds = loadServiceAccount(userServiceAccountPath);
    if (userCreds) {
        userApp = admin.initializeApp(
            { credential: admin.credential.cert(userCreds) },
            "userApp"
        );
        console.log("✅ Firebase User app initialized");
    }

    const deliveryCreds = loadServiceAccount(deliveryServiceAccountPath);
    if (deliveryCreds) {
        deliveryApp = admin.initializeApp(
            { credential: admin.credential.cert(deliveryCreds) },
            "deliveryApp"
        );
        console.log("✅ Firebase Delivery app initialized");
    }
} catch (error) {
    console.error("🔥 Error initializing Firebase apps:", error.message);
}

/**
 * Generic function to send notifications
 */
const sendNotification = async ({ ids, title, message, type, firebaseApp, table, data = {} }) => {
    try {
        if (!firebaseApp) {
            return {
                success: false,
                message: `Firebase app for ${type} not initialized. Check service account files.`
            };
        }

        // Normalize IDs -> Prisma expects Int
        const normalizedIds = (Array.isArray(ids) ? ids : [ids]).map(id => Number(id));

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

        // Use new v11+ API
        const response = await getMessaging(firebaseApp).sendEachForMulticast({
            tokens,
            notification: { title, body: message },
            data
        });

        console.log(`✅ Sent ${type} notification → Success: ${response.successCount}, Failed: ${response.failureCount}`);

        const failedTokens = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`❌ Failed ${type} token ${tokens[idx]}:`, resp.error);
                    if (resp.error.code === 'messaging/invalid-argument' ||
                        resp.error.code === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });

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

const removeInvalidTokens = async (table, tokens) => {
    try {
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

export const sendMultiTypeNotification = async ({ targets, title, message, data = {} }) => {
    try {
        const results = [];

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

        return { success: true, message: "Notifications sent to all targets", results };
    } catch (error) {
        console.error("🔥 Error sending multi-type notification:", error);
        return { success: false, message: "Failed to send multi-type notification", error: error.message };
    }
};

export const sendVendorNotification = (ids, title, message, data = {}) =>
    sendNotification({ ids, title, message, type: "vendor", firebaseApp: vendorApp, table: "vendor", data });

export const sendUserNotification = (ids, title, message, data = {}) =>
    sendNotification({ ids, title, message, type: "user", firebaseApp: userApp, table: "user", data });

export const sendDeliveryNotification = (ids, title, message, data = {}) =>
    sendNotification({ ids, title, message, type: "delivery", firebaseApp: deliveryApp, table: "deliveryPartner", data });

export const getFirebaseAppStatus = () => ({
    vendorApp: !!vendorApp,
    userApp: !!userApp,
    deliveryApp: !!deliveryApp
});
