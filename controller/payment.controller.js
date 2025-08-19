import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import Razorpay from "razorpay";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_rA0MAFpr4GmwXK",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "Nu6GDvKUbd3IJvdNARKT5EoT",
});

//-------------Razorpay Payment Functions-----------------//

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const amount = parseInt(req.body.amount, 10);
    const user_id = req.user.id;
    // Basic validation

    if (!amount || !user_id) {
      return res
        .status(200)
        .send({ status: 400, error: "Amount or user not found" });
    }

    const options = {
      amount: amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(200).send({ status: 400, error: "Order not created" });
    }

    return res
      .status(200)
      .send({ status: 200, message: "Order created", order });
  } catch (err) {
    console.error("🔥 Razorpay error:", err);
    return res.status(500).send({ status: 500, error: err.message });
  }
};

export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency = "INR",
      order_id,
    } = req.body;

    const user_id = req.user.id;

    console.log(user_id);

    // Basic validation
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !amount ||
      !currency ||
      // !order_id ||
      !user_id
    ) {
      return res
        .status(400)
        .json({ status: 400, error: "Missing required fields" });
    }
    console.log("keyyyyy:::::", process.env.RAZORPAY_KEY_SECRET);

    // Create signature hash
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    const isValid = generatedSignature === razorpay_signature;
    const paymentData = {
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amount: Math.round(amount / 100), // Convert paise to ₹ (if from Razorpay)
      currency,
      userId: parseInt(user_id), // Ensure it's an integer
      // orderId: parseInt(order_id), // 👈 FIX THIS if it's a string
      status: isValid ? "COMPLETED" : "FAILED",
      paymentType: "ORDER",
      source: "RAZORPAY",
    };
    const payment = await prisma.payments.create({ data: paymentData });

    return res.status(isValid ? 200 : 400).json({
      status: isValid ? 200 : 400,
      message: isValid
        ? "Payment verified successfully"
        : "Payment verification failed",
      id: payment.id,
    });
  } catch (err) {
    console.error("💥 Payment verification error:", err);
    return next(err);
  }
};

//--------------Vendor wallet----------------//

export const createVendorWalletOrder = async (req, res) => {
  const { amount } = req.body;
  const vendorId = req.user.id; // assuming vendor is logged in

  if (!vendorId) {
    return res.status(401).json({ error: "Unauthorized: Missing vendor ID" });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // ✅ Fetch user's wallet
  const vendorWallet = await prisma.vendorWallet.findUnique({
    where: { vendorId },
  });

  if (!vendorWallet) {
    return res.status(404).json({ error: "Vendor wallet not found" });
  }

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `vendor_wallet_${Date.now()}_${vendorId}`,
  });

  // ✅ Save order in walletOrder
  const walletOrder = await prisma.walletOrder.create({
    data: {
      walletType: "VENDOR",
      walletId: vendorWallet.id, // 👈 link to vendorWallet.id
      razorpayOrderId: order.id,
      amount,
      currency: "INR",
      status: "PENDING",
    },
  });

  return res.status(201).json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    walletOrderId: walletOrder.id,
  });
};

export const verifyVendorWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;

    const vendorId = req.user.id;

    // 1️⃣ Find the wallet order for this user
    const walletOrder = await prisma.walletOrder.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        walletType: "VENDOR",
      },
    });

    if (!walletOrder) {
      return res.status(404).json({ error: "Wallet order not found." });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await prisma.walletOrder.update({
        where: { id: walletOrder.id },
        data: { status: "FAILED" },
      });
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // 3️⃣ Payment verified — perform transaction
    await prisma.$transaction(async (tx) => {
      // Update wallet order
      await tx.walletOrder.update({
        where: { id: walletOrder.id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "SUCCESS",
        },
      });

      // Update wallet balance
      await tx.vendorWallet.update({
        where: { id: walletOrder.walletId },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      await tx.vendorWalletTransaction.create({
        data: {
          vendorId,
          walletId: walletOrder.walletId,
          amount,
          type: "CREDIT",
          paymentId: razorpay_payment_id,
        },
      });
    });

    res.json({ success: true, message: "User wallet credited successfully" });
  } catch (error) {
    console.error("Error verifying user wallet payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVendorWallet = async (req, res) => {
  try {
    const vendorId = req.user?.id;

    if (!vendorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const wallet = await prisma.vendorWallet.findUnique({
      where: { vendorId },
      select: {
        id: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ wallet });
  } catch (err) {
    console.error("Error fetching wallet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createVendorDebitTransaction = async (req, res) => {
  try {
    const vendorId = req.user?.id;
    const { amount } = req.body;

    if (!vendorId || !amount) {
      return res.status(400).json({
        success: false,
        message: "vendorId and amount are required",
      });
    }

    // Find wallet
    const wallet = await prisma.vendorWallet.findUnique({
      where: { vendorId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // Check balance
    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // Update wallet balance
    const updatedWallet = await prisma.vendorWallet.update({
      where: { id: wallet.id },
      data: { balance: wallet.balance - amount },
    });

    // Create debit transaction
    const transaction = await prisma.vendorWalletTransaction.create({
      data: {
        vendorId,
        walletId: wallet.id,
        amount,
        type: "DEBIT",
      },
    });

    res.status(201).json({
      success: true,
      message: "Wallet debited successfully",
      data: {
        wallet: updatedWallet,
        transaction,
      },
    });
  } catch (error) {
    console.error("Error in createDebitTransaction:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//--------------User wallet----------------//

export const createUserWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: Missing user ID" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ✅ Fetch user's wallet
    const userWallet = await prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!userWallet) {
      return res.status(404).json({ error: "User wallet not found" });
    }

    // ✅ Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `user_wallet_${Date.now()}_${userId}`,
    });

    // ✅ Save order in walletOrder
    const walletOrder = await prisma.walletOrder.create({
      data: {
        walletType: "USER",
        walletId: userWallet.id, // 👈 link to userWallet.id
        razorpayOrderId: order.id,
        amount,
        currency: "INR",
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      walletOrderId: walletOrder.id,
    });
  } catch (error) {
    console.error("Error creating user wallet order:", error);
    return res.status(500).json({ error: "Failed to create wallet order" });
  }
};

export const verifyUserWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;
    const userId = req.user.id;

    // 1️⃣ Find the wallet order for this user
    const walletOrder = await prisma.walletOrder.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        walletType: "USER",
      },
    });

    if (!walletOrder) {
      return res.status(404).json({ error: "Wallet order not found." });
    }

    // 2️⃣ Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await prisma.walletOrder.update({
        where: { id: walletOrder.id },
        data: { status: "FAILED" },
      });
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // 3️⃣ Payment verified — perform transaction
    await prisma.$transaction(async (tx) => {
      // Update wallet order
      await tx.walletOrder.update({
        where: { id: walletOrder.id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "SUCCESS",
        },
      });

      // Update wallet balance
      await tx.userWallet.update({
        where: { id: walletOrder.walletId },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      await tx.userWalletTransaction.create({
        data: {
          userId,
          walletId: walletOrder.walletId,
          amount,
          type: "CREDIT",
          paymentId: razorpay_payment_id,
        },
      });
    });

    res.json({ success: true, message: "User wallet credited successfully" });
  } catch (error) {
    console.error("Error verifying user wallet payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserWallet = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ wallet });
  } catch (err) {
    console.error("Error fetching wallet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createUserDebitTransaction = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: "userId and amount are required",
      });
    }

    // Find wallet
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // Check balance
    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // Update wallet balance
    const updatedWallet = await prisma.userWallet.update({
      where: { id: wallet.id },
      data: { balance: wallet.balance - amount },
    });

    // Create debit transaction
    const transaction = await prisma.userWalletTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount,
        type: "DEBIT",
      },
    });

    res.status(201).json({
      success: true,
      message: "Wallet debited successfully",
      data: {
        wallet: updatedWallet,
        transaction,
      },
    });
  } catch (error) {
    console.error("Error in createDebitTransaction:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//--------------Delivery Partner wallet----------------//

export const createDeliveryWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const deliveryId = req.user?.id;

    if (!deliveryId) {
      return res.status(401).json({ error: "Unauthorized: Missing delivery partner ID" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ✅ Fetch user's wallet
    const deliveryWallet = await prisma.deliveryWallet.findUnique({
      where: { deliveryId },
    });

    if (!deliveryWallet) {
      return res.status(404).json({ error: "Delivery wallet not found" });
    }

    // ✅ Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `delivery_wallet_${Date.now()}_${deliveryId}`,
    });

    // ✅ Save order in walletOrder
    const walletOrder = await prisma.walletOrder.create({
      data: {
        walletType: "DELIVERY_PARTNER",
        walletId: deliveryWallet.id, // 👈 link to userWallet.id
        razorpayOrderId: order.id,
        amount,
        currency: "INR",
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      walletOrderId: walletOrder.id,
    });
  } catch (error) {
    console.error("Error creating user wallet order:", error);
    return res.status(500).json({ error: "Failed to create wallet order" });
  }
};

export const verifyDeliveryWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;
    const deliveryId = req.user.id;

    // 1️⃣ Find the wallet order for this user
    const walletOrder = await prisma.walletOrder.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        walletType: "DELIVERY_PARTNER",
      },
    });

    if (!walletOrder) {
      return res.status(404).json({ error: "Wallet order not found." });
    }

    // 2️⃣ Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await prisma.walletOrder.update({
        where: { id: walletOrder.id },
        data: { status: "FAILED" },
      });
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // 3️⃣ Payment verified — perform transaction
    await prisma.$transaction(async (tx) => {
      // Update wallet order
      await tx.walletOrder.update({
        where: { id: walletOrder.id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "SUCCESS",
        },
      });

      // Update wallet balance
      await tx.deliveryWallet.update({
        where: { id: walletOrder.walletId },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      await tx.deliveryWalletTransaction.create({
        data: {
          deliveryId,
          walletId: walletOrder.walletId,
          amount,
          type: "CREDIT",
          paymentId: razorpay_payment_id,
        },
      });
    });

    res.json({ success: true, message: "Delivery wallet credited successfully" });
  } catch (error) {
    console.error("Error verifying user wallet payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDeliveryWallet = async (req, res) => {
  try {
    const deliveryId = req.user?.id;

    if (!deliveryId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const wallet = await prisma.deliveryWallet.findUnique({
      where: { deliveryId },
      select: {
        id: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ wallet });
  } catch (err) {
    console.error("Error fetching wallet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createDeliveryDebitTransaction = async (req, res) => {
  try {
    const deliveryId = req.user?.id;
    const { amount } = req.body;

    if (!deliveryId || !amount) {
      return res.status(400).json({
        success: false,
        message: "deliveryId and amount are required",
      });
    }

    // Find wallet
    const wallet = await prisma.deliveryWallet.findUnique({
      where: { deliveryId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // Check balance
    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // Update wallet balance
    const updatedWallet = await prisma.deliveryWallet.update({
      where: { id: wallet.id },
      data: { balance: wallet.balance - amount },
    });

    // Create debit transaction
    const transaction = await prisma.deliveryWalletTransaction.create({
      data: {
        deliveryId,
        walletId: wallet.id,
        amount,
        type: "DEBIT",
      },
    });

    res.status(201).json({
      success: true,
      message: "Wallet debited successfully",
      data: {
        wallet: updatedWallet,
        transaction,
      },
    });
  } catch (error) {
    console.error("Error in createDebitTransaction:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//--------------Admin Partner wallet----------------//

export const createAdminWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized: Missing admin ID" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ✅ Fetch user's wallet
    const adminWallet = await prisma.adminWallet.findUnique({
      where: { adminId },
    });

    if (!adminWallet) {
      return res.status(404).json({ error: "Admin wallet not found" });
    }

    // ✅ Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `admin_wallet_${Date.now()}_${adminId}`,
    });

    // ✅ Save order in walletOrder
    const walletOrder = await prisma.walletOrder.create({
      data: {
        walletType: "ADMIN",
        walletId: adminWallet.id, // 👈 link to userWallet.id
        razorpayOrderId: order.id,
        amount,
        currency: "INR",
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      walletOrderId: walletOrder.id,
    });
  } catch (error) {
    console.error("Error creating user wallet order:", error);
    return res.status(500).json({ error: "Failed to create wallet order" });
  }
};

export const verifyAdminWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;
    const adminId = req.user.id;

    // 1️⃣ Find the wallet order for this user
    const walletOrder = await prisma.walletOrder.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        walletType: "ADMIN",
      },
    });

    if (!walletOrder) {
      return res.status(404).json({ error: "Wallet order not found." });
    }

    // 2️⃣ Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await prisma.walletOrder.update({
        where: { id: walletOrder.id },
        data: { status: "FAILED" },
      });
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // 3️⃣ Payment verified — perform transaction
    await prisma.$transaction(async (tx) => {
      // Update wallet order
      await tx.walletOrder.update({
        where: { id: walletOrder.id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "SUCCESS",
        },
      });

      // Update wallet balance
      await tx.adminWallet.update({
        where: { id: walletOrder.walletId },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      await tx.adminWalletTransaction.create({
        data: {
          adminId,
          walletId: walletOrder.walletId,
          amount,
          type: "CREDIT",
          paymentId: razorpay_payment_id,
        },
      });
    });

    res.json({ success: true, message: "Admin wallet credited successfully" });
  } catch (error) {
    console.error("Error verifying user wallet payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAdminWallet = async (req, res) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const wallet = await prisma.adminWallet.findUnique({
      where: { adminId },
      select: {
        id: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ wallet });
  } catch (err) {
    console.error("Error fetching wallet:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createAdminDebitTransaction = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { amount } = req.body;

    if (!adminId || !amount) {
      return res.status(400).json({
        success: false,
        message: "adminId and amount are required",
      });
    }

    // Find wallet
    const wallet = await prisma.adminWallet.findUnique({
      where: { adminId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // Check balance
    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // Update wallet balance
    const updatedWallet = await prisma.adminWallet.update({
      where: { id: wallet.id },
      data: { balance: wallet.balance - amount },
    });

    // Create debit transaction
    const transaction = await prisma.adminWalletTransaction.create({
      data: {
        adminId,
        walletId: wallet.id,
        amount,
        type: "DEBIT",
      },
    });

    res.status(201).json({
      success: true,
      message: "Wallet debited successfully",
      data: {
        wallet: updatedWallet,
        transaction,
      },
    });
  } catch (error) {
    console.error("Error in createDebitTransaction:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};