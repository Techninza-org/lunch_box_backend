// Example usage of the sendVendorNotification function

import {
    sendVendorNotification,
    sendUserNotification,
    sendDeliveryNotification,
    sendMultiTypeNotification,
    getFirebaseAppStatus
} from "./pushNoti.js";

// Example 1: Send notification to a single vendor
const notifySingleVendor = async () => {
    const vendorId = 1; // Replace with actual vendor ID
    const result = await sendVendorNotification(
        vendorId,
        "New Order Received",
        "You have received a new order. Please prepare the meal.",
        { orderId: "12345", type: "new_order" } // Additional data payload
    );
    console.log(result);
};

// Example 2: Send notification to multiple vendors
const notifyMultipleVendors = async () => {
    const vendorIds = [1, 2, 3]; // Replace with actual vendor IDs
    const result = await sendVendorNotification(
        vendorIds,
        "System Maintenance",
        "The system will be under maintenance from 2 AM to 4 AM tonight.",
        { type: "maintenance" } // Additional data payload
    );
    console.log(result);
};

// Example 3: Send notification with additional data
const notifyUserWithOrderDetails = async () => {
    const userId = 1;
    const result = await sendUserNotification(
        userId,
        "Order Status Updated",
        "Your order has been confirmed and is being prepared.",
        {
            orderId: "ORD-12345",
            status: "confirmed",
            type: "order_status"
        }
    );
    console.log(result);
};

// Example 4: Send notification to multiple user types
const notifyAllParties = async () => {
    const result = await sendMultiTypeNotification({
        targets: {
            users: [1, 2],
            vendors: [1],
            deliveryPartners: [1]
        },
        title: "Order Ready",
        message: "Order #12345 is ready for pickup/delivery",
        data: {
            orderId: "12345",
            type: "order_ready"
        }
    });
    console.log(result);
};

// Example 5: Check Firebase app status
const checkFirebaseStatus = () => {
    const status = getFirebaseAppStatus();
    console.log("Firebase App Status:", status);
};

// Example 6: Using in an Express route/controller
export const notifyVendorsOnOrder = async (req, res) => {
    try {
        const { vendorIds, title, message, data } = req.body;

        // Validate input
        if (!vendorIds || !title || !message) {
            return res.status(400).json({
                success: false,
                message: "vendorIds, title, and message are required"
            });
        }

        // Send notification
        const result = await sendVendorNotification(vendorIds, title, message, data || {});

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: "Notifications sent successfully",
                data: result
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error("Error in notifyVendorsOnOrder:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};