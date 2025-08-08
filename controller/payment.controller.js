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

// Create a Razorpay order
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

// Verify Razorpay payment signature
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

// Create a Razorpay order for vendor wallet
export const createVendorWalletOrder = async (req, res) => {
  const { amount } = req.body;
  const vendorId = req.user.id; // assuming vendor is logged in

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `vendor_wallet_${Date.now()}_${vendorId}`,
  });

  res.json({ success: true, orderId: order.id });
};

export const verifyVendorWalletPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount,
  } = req.body;

  const vendorId = req.user.id;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  // ✅ Payment is verified — use transaction to ensure consistency
  await prisma.$transaction(async (tx) => {
    
    // 1. Add transaction entry
    await tx.vendorWalletTransaction.create({
      data: {
        vendorId,
        amount,
        type: "CREDIT",
      },
    });

    // 2. Update wallet balance
    await tx.vendorWallet.update({
      where: { vendorId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  });

  res.json({ success: true, message: "Wallet credited successfully" });
};

// Create a Razorpay order for user wallet
export const createUserWalletOrder = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id; // assuming vendor is logged in

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `vendor_wallet_${Date.now()}_${userId}`,
  });

  res.json({ success: true, orderId: order.id });
};

export const verifyUserWalletPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount,
  } = req.body;

  const userId = req.user.id;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  // ✅ Payment is verified — use transaction to ensure consistency
  await prisma.$transaction(async (tx) => {
    
    // 1. Add transaction entry
    await tx.userWalletTransaction.create({
      data: {
        userId,
        amount,
        type: "CREDIT",
      },
    });

    // 2. Update wallet balance
    await tx.userWallet.update({
      where: { userId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  });

  res.json({ success: true, message: "Wallet credited successfully" });
};


