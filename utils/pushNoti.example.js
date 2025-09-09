// Example usage of the sendVendorNotification function

import { sendVendorNotification } from "./pushNoti.js";

// Example 1: Send notification to a single vendor
const notifySingleVendor = async () => {
    const vendorId = 1; // Replace with actual vendor ID
    const result = await sendVendorNotification(
        vendorId,
        "New Order Received",
        "You have received a new order. Please prepare the meal."
    );
    console.log(result);
};

// Example 2: Send notification to multiple vendors
const notifyMultipleVendors = async () => {
    const vendorIds = [1, 2, 3]; // Replace with actual vendor IDs
    const result = await sendVendorNotification(
        vendorIds,
        "System Maintenance",
        "The system will be under maintenance from 2 AM to 4 AM tonight."
    );
    console.log(result);
};

// Example 3: Using in an Express route/controller
export const notifyVendorsOnOrder = async (req, res) => {
    try {
        const { vendorIds, title, message } = req.body;

        // Validate input
        if (!vendorIds || !title || !message) {
            return res.status(400).json({
                success: false,
                message: "vendorIds, title, and message are required"
            });
        }

        // Send notification
        const result = await sendVendorNotification(vendorIds, title, message);

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