import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// admin registration
export const adminRegister = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingAdmin) {
      return res.status(409).json({ message: "Admin already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new admin
    const newAdmin = await prisma.admin.create({
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

    res
      .status(201)
      .json({ message: "Admin registered successfully", admin: newAdmin });
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
        expiresIn: "1h",
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

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
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

// vendor registration
export const vendorRegister = async (req, res) => {
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
  const logo = req.file ? req.file.filename : null;
  console.log(logo);
  if (!logo) {
    return res.status(400).json({ message: "Logo is required" });
  }

  if (!name || !email || !password || !businessName || !phoneNumber) {
    return res.status(400).json({
      message:
        "Name, email, password, business name, and phone number are required",
    });
  }
  try {
    // Check if vendor already exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { email, phoneNumber },
      select: { id: true },
    });

    if (existingVendor) {
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
        logo: `uploads/vendors/${logo}`, // Store logo path
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
        expiresIn: "7d",
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
