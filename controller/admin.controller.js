import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const addbanner = async (req, res) => {
  try {
    const { title, description } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!title || !description || !image) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and image are required",
      });
    }

    const img = `uploads/banners/${image.split("/").pop()}`;

    const newBanner = await prisma.banner.create({
      data: {
        title,
        description,
        image: img,
      },
    });

    res.status(201).json({
      success: true,
      message: "Banner added successfully",
      data: newBanner,
    });
  } catch (error) {
    console.error("Error adding banner:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all banners
export const getBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany();
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get banner by ID
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await prisma.banner.findUnique({
      where: { id: Number(id) },
    });
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    }
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    console.error("Error fetching banner:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update banner
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    let image;
    if (req.file) {
      image = `uploads/banners/${req.file.filename}`;
    }
    const data = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (image) data.image = image;
    const updated = await prisma.banner.update({
      where: { id: Number(id) },
      data,
    });
    res
      .status(200)
      .json({ success: true, message: "Banner updated", data: updated });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete banner
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.banner.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true, message: "Banner deleted" });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//------------------User_CRUD----------------//

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        UserAddress: true,
      },
    });

    // Remove password from each user object
    const sanitizedUsers = users.map(({ password, ...rest }) => rest);

    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getUserById = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        UserAddress: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password before sending
    const { password, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const deleteUser = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the user
    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const softDeleteUser = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.isDeleted) {
      return res.status(404).json({ error: "User not found or already deleted" });
    }

    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    res.json({ message: "User soft deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

//------------------Vendor_CRUD----------------//

// Get all vendors (excluding soft-deleted)
export const getAllVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany();

    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

export const getAllVendorsWithPendingStatus = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        status: "PENDING", // enum value as string
      },
    });

    if (vendors.length === 0) {
      return res.status(200).json({ message: "No pending vendors found", data: [] });
    }

    res.status(200).json({ message: "Pending vendors fetched successfully", data: vendors });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending vendors", details: error.message });
  }
};

// Get a single vendor
export const getVendorById = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

// Update vendor
export const updateVendor = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  try {
    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });

    if (!existingVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: req.body, // You may want to validate/sanitize this input
    });

    res.json(updatedVendor);
  } catch (error) {
    res.status(500).json({ error: "Failed to update vendor", details: error.message });
  }
};

export const updateVendorStatus = async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  // Validate ID
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  // Validate status
  const allowedStatuses = ["PENDING", "APPROVED", "REJECTED"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        status,
        isActive: status === "APPROVED", // Optional: activate on approval
      },
    });

    res.status(200).json({
      message: `Vendor status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update vendor status",
      details: error.message,
    });
  }
};

//------------------DELIVERY_PARTNER_CRUD----------------//

export const getAllDeliveryPartners = async (req, res) => {
  try {
    const partners = await prisma.deliveryPartner.findMany();

    if (partners.length === 0) {
      return res.status(200).json({ message: "No delivery partners found", data: [] });
    }

    res.status(200).json({ message: "Delivery partners fetched successfully", data: partners });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch delivery partners" });
  }
};

// GET one
export const getDeliveryPartnerById = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const partner = await prisma.deliveryPartner.findUnique({ where: { id } });
    if (!partner) return res.status(404).json({ error: "Delivery partner not found" });
    res.json(partner);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch delivery partner" });
  }
};

// Update delivery partner
export const updateDeliveryPartner = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid delivery partner ID" });
  }

  try {
    const existingPartner = await prisma.deliveryPartner.findUnique({
      where: { id },
    });

    if (!existingPartner) {
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    const {
      name,
      // email,
      phoneNumber,
      // profileImage,
      // identification,
      longitude,
      latitude,
      address,
      city,
      state,
      zipCode,
      phoneNumber2,
      isActive,
      isVerified,
    } = req.body;

    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        name,
        // email,
        phoneNumber,
        // profileImage,
        // identification,
        longitude,
        latitude,
        address,
        city,
        state,
        zipCode,
        phoneNumber2,
        isActive,
        isVerified,
      },
    });

    res.status(200).json({
      message: "Delivery partner updated successfully",
      data: updatedPartner,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update delivery partner",
      details: error.message,
    });
  }
};

export const getUnverifiedDeliveryPartners = async (req, res) => {
  try {
    const partners = await prisma.deliveryPartner.findMany({
      where: { isVerified: false },
    });

    if (partners.length === 0) {
      return res.status(200).json({ message: "No unverified delivery partners found", data: [] });
    }

    res.status(200).json({
      message: "Unverified delivery partners fetched successfully",
      data: partners,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch unverified delivery partners",
      details: error.message,
    });
  }
};

export const verifyDeliveryPartner = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid delivery partner ID" });
  }

  try {
    const existingPartner = await prisma.deliveryPartner.findUnique({
      where: { id },
    });

    if (!existingPartner) {
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    const updatedPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: { isVerified: true,
        isActive: true, // Optionally activate the partner upon verification
      },
    });

    res.status(200).json({
      message: "Delivery partner verified successfully",
      data: updatedPartner,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to verify delivery partner",
      details: error.message,
    });
  }
};

export const getMealsByVendorId = async (req, res) => {
  const vendorId = parseInt(req.params.id);

  if (isNaN(vendorId)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  try {
    const meals = await prisma.meal.findMany({
      where: {
        vendorId,
        isDeleted: false, // Optional: exclude soft-deleted meals
      },
      include: {
        mealImages: true,
        mealOptionGroups: {
          include: {
            options: true,
          },
        },
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
    });

    if (meals.length === 0) {
      return res.status(200).json({ message: "No meals found for this vendor", data: [] });
    }

    res.status(200).json({
      message: "Meals fetched successfully",
      data: meals,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch meals", details: error.message });
  }
};













