import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendMail from "../utils/sendOtp.js";

// Helper to index files by fieldname
function indexFiles(files) {
  const map = {};
  if (!files) return map;
  for (const file of files) {
    if (!map[file.fieldname]) {
      map[file.fieldname] = [];
    }
    map[file.fieldname].push(file);
  }
  return map;
}

// admin registration
export const adminRegister = async (req, res) => {
  const { name, email, password, permission, permissions, subname, subName } = req.body;

  // Only required: name, email, password
  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email, and password are required",
    });
  }

  // Optional permissions (accept 'permission' or 'permissions')
  let rawPermissions = permissions !== undefined ? permissions : permission;
  let normalizedPermissions = [];

  if (rawPermissions !== undefined) {
    normalizedPermissions = rawPermissions;
    if (typeof normalizedPermissions === "string") {
      try {
        const maybeJson = JSON.parse(normalizedPermissions);
        if (Array.isArray(maybeJson) || typeof maybeJson === "object") {
          normalizedPermissions = maybeJson;
        }
      } catch {
        // keep original string
      }
    }
    if (
      typeof normalizedPermissions === "string" &&
      normalizedPermissions.includes(",")
    ) {
      normalizedPermissions = normalizedPermissions
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    }
    if (typeof normalizedPermissions === "string") {
      normalizedPermissions = [normalizedPermissions];
    }
  }

  // Optional subName (accept 'subName' or 'subname')
  const finalSubName =
    subName !== undefined
      ? subName
      : subname !== undefined
        ? subname
        : null;

  try {
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingAdmin) {
      return res.status(409).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        permissions: normalizedPermissions, // empty array if not provided
        subName: finalSubName, // null if not provided
      },
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true,
        subName: true,
        createdAt: true,
      },
    });

    await prisma.adminWallet.create({
      data: {
        adminId: newAdmin.id,
        balance: 0,
      },
    });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: newAdmin,
    });
  } catch (error) {
    console.error("Error registering admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// admin login
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Exclude password from response
    const { password: _, ...adminData } = admin;

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, role: "ADMIN" },
      process.env.JWT_SECRET,
      {
        expiresIn: "14d",
      }
    );

    res
      .status(200)
      .json({ message: "Login successful", admin: adminData, token });
  } catch (error) {
    console.error("Error logging in admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// admin forgot password
export const adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "admin not found",
      });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 min expiry

    // Save OTP in DB
    await prisma.admin.update({
      where: { email },
      data: { otp, otp_expiry: otpExpiry },
    });

    // Send OTP via email
    const emailMessage = `
      <h2>Password Reset Request</h2>
      <p>Your OTP is: <b>${otp}</b></p>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    const mailResponse = await sendMail(
      email,
      "Password Reset OTP",
      emailMessage,
      true // HTML format
    );

    if (!mailResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// admin reset password
export const adminVerifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "admin not found",
      });
    }

    // Check if OTP matches
    if (admin.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if OTP is expired
    const now = new Date();
    if (admin.otp_expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear OTP
    await prisma.admin.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otp_expiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("OTP verify/reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// user registration
export const userRegister = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    await prisma.userWallet.create({
      data: {
        userId: newUser.id,
        balance: 0,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, role: "USER" },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
      token,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// user login
export const userLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    // Block if user is soft deleted
    if (user.isDeleted === true) {
      return res.status(403).json({ message: "Account is not active" });
    }


    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }


    // Exclude password from response
    const { password: _, ...userData } = user;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: "USER" },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res
      .status(200)
      .json({ message: "Login successful", user: userData, token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// user forgot password
export const userForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 min expiry

    // Save OTP in DB
    await prisma.user.update({
      where: { email },
      data: { otp, otp_expiry: otpExpiry },
    });

    // Send OTP via email
    const emailMessage = `
      <h2>Password Reset Request</h2>
      <p>Your OTP is: <b>${otp}</b></p>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    const mailResponse = await sendMail(
      email,
      "Password Reset OTP",
      emailMessage,
      true // HTML format
    );

    if (!mailResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// user reset password
export const userVerifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if OTP is expired
    const now = new Date();
    if (user.otp_expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear OTP
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otp_expiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("OTP verify/reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// vendor registration
export const vendorRegister = async (req, res) => {
  const filesByField = indexFiles(req.files);
  const {
    name,
    email,
    password,
    phoneNumber,
    businessName,
    description,
    phoneNumber2,
    address,
    city,
    state,
  } = req.body;

  const logo = filesByField["logo"]?.[0]?.filename || null;
  const doc1 = filesByField["document1"]?.[0]?.filename || null;
  const doc2 = filesByField["document2"]?.[0]?.filename || null;
  const doc3 = filesByField["document3"]?.[0]?.filename || null;
  const doc4 = filesByField["document4"]?.[0]?.filename || null;

  if (!logo) {
    return res.status(400).json({ message: "Logo is required" });
  }
  // Documents are now optional; they can be uploaded later via a separate update endpoint.

  if (!name || !email || !password || !businessName || !phoneNumber) {
    return res.status(400).json({
      message:
        "Name, email, password, business name, and phone number are required",
    });
  }
  try {
    // Check if vendor already exists
    const existingVendorByEmail = await prisma.vendor.findUnique({
      where: { email },
      select: { id: true },
    });
    const existingVendorByPhone = await prisma.vendor.findFirst({
      where: { phoneNumber },
      select: { id: true },
    });
    if (existingVendorByEmail || existingVendorByPhone) {
      return res
        .status(409)
        .json({ message: "Vendor email or phone number already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new vendor
    const newVendor = await prisma.vendor.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phoneNumber,
        businessName,
        description,
        phoneNumber2,
        address,
        city,
        state,
        logo: `uploads/vendors/${logo}`,
        document1: `uploads/vendors/${doc1}`,
        document2: `uploads/vendors/${doc2}`,
        document3: `uploads/vendors/${doc3}`,
        document4: `uploads/vendors/${doc4}`,
        isActive: false, // Default to inactive
        status: "PENDING", // Default status
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.vendorWallet.create({
      data: {
        vendorId: newVendor.id,
        balance: 0,
      },
    });

    res
      .status(201)
      .json({ message: "Vendor registered successfully", vendor: newVendor });
  } catch (error) {
    console.error("Error registering vendor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// vendor login
export const vendorLogin = async (req, res) => {
  const { email, password } = req.body;

  console.log(email, password);

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find vendor by email
    const vendor = await prisma.vendor.findUnique({
      where: { email },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    if (vendor.isDeleted == true || vendor.status === "PENDING") {
      return res.status(403).json({ message: "Account is not active or pending approval" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Exclude password from response
    const { password: _, ...vendorData } = vendor;

    // Generate JWT token
    const token = jwt.sign(
      { id: vendor.id, role: "VENDOR" },
      process.env.JWT_SECRET,
      {
        expiresIn: "14d",
      }
    );

    res
      .status(200)
      .json({ message: "Login successful", vendor: vendorData, token });
  } catch (error) {
    console.error("Error logging in vendor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// vendor forgot password
export const vendorForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 min expiry

    // Save OTP in DB
    await prisma.vendor.update({
      where: { email },
      data: { otp, otp_expiry: otpExpiry },
    });

    // Send OTP via email
    const emailMessage = `
      <h2>Password Reset Request</h2>
      <p>Your OTP is: <b>${otp}</b></p>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    const mailResponse = await sendMail(
      email,
      "Password Reset OTP",
      emailMessage,
      true // HTML format
    );

    if (!mailResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// vendor reset password
export const vendorVerifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    const vendor = await prisma.vendor.findUnique({ where: { email } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "vendor not found",
      });
    }

    // Check if OTP matches
    if (vendor.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if OTP is expired
    const now = new Date();
    if (vendor.otp_expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear OTP
    await prisma.vendor.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otp_expiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("OTP verify/reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// delivery partner registration
export const deliveryPartnerRegister = async (req, res) => {
  try {
    const filesByField = indexFiles(req.files);
    const {
      name,
      email,
      phoneNumber,
      password,
      address,
      city,
      state,
      zipCode,
      phoneNumber2,
    } = req.body;

    if (
      !name ||
      !email ||
      !phoneNumber ||
      !password ||
      !address ||
      !city ||
      !state ||
      !zipCode
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // get profile image and document images from request
    const profileImage = filesByField["profile-image"]
      ? `uploads/delivery-partners/${filesByField["profile-image"][0].filename}`
      : null;
    const documentImages = filesByField["documents"]
      ? filesByField["documents"].map(
        (file) => `uploads/delivery-partners/${file.filename}`
      )
      : [];

    // Validate profile image and document images
    if (!profileImage || documentImages.length === 0) {
      return res
        .status(400)
        .json({ message: "Profile image and documents are required" });
    }

    // Check if delivery partner already exists
    const existingPartner = await prisma.deliveryPartner.findUnique({
      where: { email, phoneNumber },
      select: { id: true },
    });

    if (existingPartner) {
      return res.status(409).json({
        message: "Delivery partner email or phone number already exists",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new delivery partner
    const newPartner = await prisma.deliveryPartner.create({
      data: {
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        address,
        city,
        state,
        zipCode,
        phoneNumber2,
        isActive: false,
        isVerified: false,
        profileImage,
        identification: documentImages.join(","),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    await prisma.deliveryWallet.create({
      data: {
        deliveryId: newPartner.id,
        balance: 0,
      },
    });

    res.status(201).json({
      message: "Delivery partner registered successfully",
      partner: newPartner,
    });
  } catch (error) {
    console.error("Error registering delivery partner:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// delivery partner login
export const deliveryPartnerLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find delivery partner by email
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { email },
    });

    if (!deliveryPartner) {
      return res
        .status(404)
        .json({ message: "Invalid email or password or account not verified" });
    }

    // Block if delivery partner is soft deleted
    if (deliveryPartner.isDeleted === true) {
      return res.status(403).json({ message: "Account is not active" });
    }

    // Check if the account is verified
    if (!deliveryPartner.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      password,
      deliveryPartner.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Exclude password from response
    const { password: _, ...deliveryPartnerData } = deliveryPartner;

    // Generate JWT token
    const token = jwt.sign(
      { id: deliveryPartner.id, role: "DELIVERY" },
      process.env.JWT_SECRET,
      {
        expiresIn: "14d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      deliveryPartner: deliveryPartnerData,
      token,
    });
  } catch (error) {
    console.error("Error logging in delivery partner:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// deliveryPartner forgot password
export const deliveryForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { email },
    });
    if (!deliveryPartner) {
      return res.status(400).json({
        success: false,
        message: "deliveryPartner not found",
      });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 min expiry

    // Save OTP in DB
    await prisma.deliveryPartner.update({
      where: { email },
      data: { otp, otp_expiry: otpExpiry },
    });

    // Send OTP via email
    const emailMessage = `
      <h2>Password Reset Request</h2>
      <p>Your OTP is: <b>${otp}</b></p>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    const mailResponse = await sendMail(
      email,
      "Password Reset OTP",
      emailMessage,
      true // HTML format
    );

    if (!mailResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// deliveryPartner reset password
export const deliveryVerifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { email },
    });

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "deliveryPartner not found",
      });
    }

    // Check if OTP matches
    if (deliveryPartner.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if OTP is expired
    const now = new Date();
    if (deliveryPartner.otp_expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear OTP
    await prisma.deliveryPartner.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otp_expiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("OTP verify/reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
