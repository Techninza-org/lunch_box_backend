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

export const toggleSoftDeleteUser = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isDeleted: !user.isDeleted,
        isActive: user.isDeleted, // reactivate if undeleting
        deletedAt: user.isDeleted ? null : new Date(),
      },
    });

    res.status(200).json({
      message: `User has been ${updatedUser.isDeleted ? "soft deleted" : "restored"}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Toggle soft delete user error:", error);
    res.status(500).json({ error: "Failed to toggle user deletion", details: error.message });
  }
};


//------------------Vendor_CRUD----------------//

// Get all vendors (excluding soft-deleted)
export const getAllVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        status: 'APPROVED', // fixed typo here
      },
    });

    if (vendors.length === 0) {
      return res.status(200).json({ message: "No approved vendors found", data: [] });
    }

    res.status(200).json({ message: "Approved vendors fetched successfully", data: vendors });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors", details: error.message });
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

export const getMealsByVendorId = async (req, res) => {
  const vendorId = parseInt(req.params.id);

  if (isNaN(vendorId)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  try {
    // Fetch verified meals
    const verifiedMeals = await prisma.meal.findMany({
      where: {
        vendorId,
        isDeleted: false,
        isVerified: true,
      },
      include: {
        mealImages: true,
        mealOptionGroups: {
          include: { options: true },
        },
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
    });

    // Fetch unverified meals
    const unverifiedMeals = await prisma.meal.findMany({
      where: {
        vendorId,
        isDeleted: false,
        isVerified: false,
      },
      include: {
        mealImages: true,
        mealOptionGroups: {
          include: { options: true },
        },
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
    });

    res.status(200).json({
      message: "Meals fetched successfully",
      verified: verifiedMeals,
      unverified: unverifiedMeals,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch meals", details: error.message });
  }
};

export const toggleVerifyMeal = async (req, res) => {
  const mealId = parseInt(req.params.id);

  if (isNaN(mealId)) {
    return res.status(400).json({ error: "Invalid meal ID" });
  }

  try {
    const existingMeal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!existingMeal) {
      return res.status(404).json({ error: "Meal not found" });
    }

    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        isVerified: !existingMeal.isVerified,
      },
    });

    res.status(200).json({
      message: `Meal verification status set to ${updatedMeal.isVerified}`,
      data: updatedMeal,
    });
  } catch (error) {
    console.error("Error toggling meal verification:", error);
    res.status(500).json({ error: "Failed to toggle meal verification", details: error.message });
  }
};


// PATCH /vendor/:id/toggle-delete
export const toggleSoftDeleteVendor = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  try {
    const vendor = await prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const toggledVendor = await prisma.vendor.update({
      where: { id },
      data: {
        isDeleted: !vendor.isDeleted,
        deletedAt: vendor.isDeleted ? null : new Date(),
        isActive: vendor.isDeleted ? true : false, // Optional: re-activate if undeleting
      },
    });

    res.status(200).json({
      message: `Vendor has been ${toggledVendor.isDeleted ? "soft-deleted" : "restored"} successfully.`,
      data: toggledVendor,
    });
  } catch (error) {
    console.error("Toggle delete error:", error);
    res.status(500).json({
      error: "Failed to toggle soft delete",
      details: error.message,
    });
  }
};

// DELETE /vendor/:id/hard-delete
export const hardDeleteVendor = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid vendor ID" });
  }

  try {
    const existingVendor = await prisma.vendor.findUnique({ where: { id } });

    if (!existingVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await prisma.vendor.delete({ where: { id } });

    res.status(200).json({
      message: "Vendor permanently deleted from the system.",
    });
  } catch (error) {
    console.error("Error hard-deleting vendor:", error);
    res.status(500).json({
      error: "Failed to hard delete vendor",
      details: error.message,
    });
  }
};

// GET /meals/all
export const getAllMeals = async (req, res) => {
  try {
    const allMeals = await prisma.meal.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        mealImages: true,
        mealOptionGroups: {
          include: { options: true },
        },
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
    });

    res.status(200).json({
      message: "All meals fetched successfully",
      meals: allMeals,
    });
  } catch (error) {
    console.error("Error fetching all meals:", error);
    res.status(500).json({ error: "Failed to fetch meals", details: error.message });
  }
};

export const getMealById = async (req, res) => {
  const mealId = parseInt(req.params.id);

  if (isNaN(mealId)) {
    return res.status(400).json({ error: "Invalid meal ID" });
  }

  try {
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        mealImages: true,
        mealOptionGroups: {
          include: { options: true },
        },
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
    });

    if (!meal || meal.isDeleted) {
      return res.status(404).json({ error: "Meal not found" });
    }

    res.status(200).json({
      message: "Meal fetched successfully",
      data: meal,
    });
  } catch (error) {
    console.error("Error fetching meal by ID:", error);
    res.status(500).json({ error: "Failed to fetch meal", details: error.message });
  }
};

export const getAllMealsGroupedByVerification = async (req, res) => {
  try {
    const verifiedMeals = await prisma.meal.findMany({
      where: {
        isDeleted: false,
        isVerified: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        mealImages: true,
        mealOptionGroups: {
          include: { options: true },
        },
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
    });

    const unverifiedMeals = await prisma.meal.findMany({
      where: {
        isDeleted: false,
        isVerified: false,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        mealImages: true,
        mealOptionGroups: {
          include: { options: true },
        },
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
    });

    res.status(200).json({
      message: "All meals fetched successfully",
      verified: verifiedMeals,
      unverified: unverifiedMeals,
    });
  } catch (error) {
    console.error("Error fetching meals:", error);
    res.status(500).json({
      error: "Failed to fetch meals",
      details: error.message,
    });
  }
};

export const toggleMealAvailability = async (req, res) => {
  const mealId = parseInt(req.params.id);

  if (isNaN(mealId)) {
    return res.status(400).json({ error: "Invalid meal ID" });
  }

  try {
    const existingMeal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!existingMeal) {
      return res.status(404).json({ error: "Meal not found" });
    }

    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        isAvailable: !existingMeal.isAvailable,
      },
    });

    res.status(200).json({
      message: `Meal availability toggled to ${updatedMeal.isAvailable}`,
      data: updatedMeal,
    });
  } catch (error) {
    console.error("Error toggling meal availability:", error);
    res.status(500).json({
      error: "Failed to toggle availability",
      details: error.message,
    });
  }
};







//------------------DELIVERY_PARTNER_CRUD----------------//

export const getAllDeliveryPartners = async (req, res) => {
  try {
    const verifiedPartners = await prisma.deliveryPartner.findMany({
      where: { isVerified: true },
    });

    const unverifiedPartners = await prisma.deliveryPartner.findMany({
      where: { isVerified: false },
    });

    res.status(200).json({
      message: "Delivery partners fetched successfully",
      verified: verifiedPartners,
      unverified: unverifiedPartners,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch delivery partners",
      details: error.message,
    });
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

export const unverifyDeliveryPartner = async (req, res) => {
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
      data: {
        isVerified: false,
        isActive: false, // optional
      },
    });

    res.status(200).json({
      message: "Delivery partner unverified successfully",
      data: updatedPartner,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to unverify delivery partner",
      details: error.message,
    });
  }
};

export const toggleSoftDeleteDeliveryPartner = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid delivery partner ID" });
  }

  try {
    const deliveryPartner = await prisma.deliveryPartner.findUnique({ where: { id } });

    if (!deliveryPartner) {
      return res.status(404).json({ error: "deliveryPartner not found" });
    }

    const toggledDeliveryPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        isDeleted: !deliveryPartner.isDeleted,
        deletedAt: deliveryPartner.isDeleted ? null : new Date(),
        isActive: deliveryPartner.isDeleted ? true : false, // Optional: re-activate if undeleting
      },
    });

    res.status(200).json({
      message: `Vendor has been ${toggledDeliveryPartner.isDeleted ? "soft-deleted" : "restored"} successfully.`,
      data: toggledDeliveryPartner,
    });
  } catch (error) {
    console.error("Toggle delete error:", error);
    res.status(500).json({
      error: "Failed to toggle soft delete",
      details: error.message,
    });
  }
};

export const hardDeleteDeliveryPartner = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid DeliveryPartner ID" });
  }

  try {
    const existingDeliveryPartner = await prisma.deliveryPartner.findUnique({ where: { id } });

    if (!existingDeliveryPartner) {
      return res.status(404).json({ error: "DeliveryPartner not found" });
    }

    await prisma.deliveryPartner.delete({ where: { id } });

    res.status(200).json({
      message: "DeliveryPartner permanently deleted from the system.",
    });
  } catch (error) {
    console.error("Error hard-deleting vendor:", error);
    res.status(500).json({
      error: "Failed to hard delete vendor",
      details: error.message,
    });
  }
};



//------------------SETTINGS----------------//

// POST /settings - Create or Update Settings
export const upsertSettings = async (req, res) => {
  const {
    gst,
    vendorCommission,
    deliveryPartnerCommission,
    adminCommission,
    deliveryChargePerKm,
    platformCharge,
  } = req.body;

  try {
    // Check if settings already exist
    const existing = await prisma.settings.findFirst();

    if (existing) {
      // Update existing settings
      const updated = await prisma.settings.update({
        where: { id: existing.id },
        data: {
          gst,
          vendorCommission,
          deliveryPartnerCommission,
          adminCommission,
          deliveryChargePerKm,
          platformCharge,
        },
      });
      return res.json({ message: "Settings updated", data: updated });
    } else {
      // Create new settings
      const created = await prisma.settings.create({
        data: {
          gst,
          vendorCommission,
          deliveryPartnerCommission,
          adminCommission,
          deliveryChargePerKm,
          platformCharge,
        },
      });
      return res.status(201).json({ message: "Settings created", data: created });
    }
  } catch (error) {
    console.error("Error creating/updating settings:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllNotifications = async (req, res) => {
  const { role, userId } = req.query;

  const filters = [];

  if (userId) {
    filters.push({ userId: parseInt(userId) });
  }

  if (role) {
    filters.push({ role: role.toUpperCase() });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: filters.length ? { OR: filters } : {},
      orderBy: { createdAt: "desc" },
    });

    const enriched = await Promise.all(
      notifications.map(async (notif) => {
        let name = null;

        if (notif.userId) {
          switch (notif.role) {
            case "USER":
              const user = await prisma.user.findUnique({ where: { id: notif.userId } });
              name = user?.name || null;
              break;
            case "VENDOR":
              const vendor = await prisma.vendor.findUnique({ where: { id: notif.userId } });
              name = vendor?.name || null;
              break;
            case "DELIVERY_PARTNER":
              const dp = await prisma.deliveryPartner.findUnique({ where: { id: notif.userId } });
              name = dp?.name || null;
              break;
            default:
              name = null;
          }
        }

        return {
          ...notif,
          name,
        };
      })
    );

    return res.status(200).json({ notifications: enriched });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};















