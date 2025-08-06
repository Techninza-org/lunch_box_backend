import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const updateVendorProfile = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid vendor ID" });

  const {
    name,
    email,
    // password,
    phoneNumber,
    businessName,
    description,
    phoneNumber2,
    address,
    city,
    state,
    // longitude,
    // latitude,
  } = req.body;

  const logo = req.file ? req.file.filename : null;

  try {
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });

    if (!existingVendor || existingVendor.isDeleted) {
      return res.status(404).json({ message: "Vendor not found or deleted" });
    }

    // Check if email or phoneNumber are already in use (by someone else)
    if (email && email !== existingVendor.email) {
      const emailExists = await prisma.vendor.findFirst({
        where: { email, NOT: { id } },
      });
      if (emailExists) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    if (phoneNumber && phoneNumber !== existingVendor.phoneNumber) {
      const phoneExists = await prisma.vendor.findFirst({
        where: { phoneNumber, NOT: { id } },
      });
      if (phoneExists) {
        return res.status(409).json({ message: "Phone number already in use" });
      }
    }

    // let hashedPassword = undefined;
    // if (password) {
    //   hashedPassword = await bcrypt.hash(password, 12);
    // }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        email,
        // password: hashedPassword,
        phoneNumber,
        phoneNumber2,
        businessName,
        description,
        address,
        city,
        state,
        // longitude: longitude ? parseFloat(longitude) : undefined,
        // latitude: latitude ? parseFloat(latitude) : undefined,
        logo: logo ? `uploads/vendors/${logo}` : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        status: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "Vendor profile updated successfully",
      vendor: updatedVendor,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateVendorMealTimes = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid vendor ID" });

  const {
    breakfastStart,
    breakfastEnd,
    lunchStart,
    lunchEnd,
    eveningStart,
    eveningEnd,
    dinnerStart,
    dinnerEnd,
  } = req.body;

  try {
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });

    if (!existingVendor || existingVendor.isDeleted) {
      return res.status(404).json({ message: "Vendor not found or deleted" });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        breakfastStart,
        breakfastEnd,
        lunchStart,
        lunchEnd,
        eveningStart,
        eveningEnd,
        dinnerStart,
        dinnerEnd,
      },
      select: {
        id: true,
        name: true,
        breakfastStart: true,
        breakfastEnd: true,
        lunchStart: true,
        lunchEnd: true,
        eveningStart: true,
        eveningEnd: true,
        dinnerStart: true,
        dinnerEnd: true,
      },
    });

    return res.status(200).json({
      message: "Meal times updated successfully",
      vendor: updatedVendor,
    });
  } catch (err) {
    console.error("Error updating meal times:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addOrUpdateVendorBankDetail = async (req, res) => {
  const vendorId = req.user?.id;
  console.log("Vendor ID from token:", vendorId);

  if (!vendorId || isNaN(vendorId)) {
    return res.status(401).json({ message: "Unauthorized or invalid vendor ID" });
  }

  const {
    accountHolder,
    accountNumber,
    ifscCode,
    bankName,
    // branchName,
    // upiId,
  } = req.body;

  if (!accountHolder || !accountNumber || !ifscCode || !bankName) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    const existingDetails = await prisma.vendorBankDetail.findUnique({
      where: { vendorId },
    });

    if (existingDetails) {
      // Update bank details
      const updatedDetails = await prisma.vendorBankDetail.update({
        where: { vendorId },
        data: {
          accountHolder,
          accountNumber,
          ifscCode,
          bankName,
        //   branchName,
        //   upiId,
        },
      });

      return res.status(200).json({
        message: "Bank details updated successfully",
        data: updatedDetails,
      });
    } else {
      // Create new bank details
      const newDetails = await prisma.vendorBankDetail.create({
        data: {
          vendorId,
          accountHolder,
          accountNumber,
          ifscCode,
          bankName,
        //   branchName,
        //   upiId,
        },
      });

      return res.status(201).json({
        message: "Bank details added successfully",
        data: newDetails,
      });
    }
  } catch (error) {
    console.error("Error saving bank details:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        message: `Duplicate value for unique field: ${error.meta.target}`,
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const toggleVendorActive = async (req, res) => {
  const vendorId = req.user?.id;

  if (!vendorId || isNaN(vendorId)) {
    return res.status(401).json({ message: "Unauthorized or invalid vendor ID" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });

    if (!vendor || vendor.isDeleted) {
      return res.status(404).json({ message: "Vendor not found or deleted" });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        isActive: !vendor.isActive, // Toggle the boolean
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: `Vendor is now ${updatedVendor.isActive ? "active" : "inactive"}`,
      vendor: updatedVendor,
    });
  } catch (err) {
    console.error("Error toggling isActive:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};