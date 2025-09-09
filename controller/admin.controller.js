import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


// -------admin section--------

// Get all admins
export const getAllAdmin = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });

    const sanitized = admins.map(({ password, otp, otp_expiry, ...rest }) => rest);

    res.status(200).json({ success: true, data: sanitized });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const softdeleteAdmin = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid admin ID" });
    }

    const admin = await prisma.admin.findUnique({ where: { id } });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: {
        isDeleted: !admin.isDeleted,
      },
    });

    // Remove sensitive fields before sending
    const { password, otp, otp_expiry, ...safeAdmin } = updated;

    return res.status(200).json({
      success: true,
      message: `Admin has been ${safeAdmin.isDeleted ? "soft deleted" : "restored"}`,
      data: safeAdmin,
    });
  } catch (error) {
    console.error("Error toggling admin soft delete:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



function indexFiles(files) {
  const map = {};
  if (!files) return map;
  for (const file of files) {
    if (!map[file.fieldname]) map[file.fieldname] = [];
    map[file.fieldname].push(file);
  }
  return map;
}

export const addbanner = async (req, res) => {
  try {
  const { title, description } = req.body;
  const audienceRaw = (req.body?.audience ?? req.body?.audiance ?? null);
    const filesByField = indexFiles(req.files);
    const imageFile = (filesByField["image"]?.[0]) || (filesByField["banner"]?.[0]) || (filesByField["file"]?.[0]) || null;
    const image = imageFile ? imageFile.filename : null;

  if (!title || !description || !image) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and image are required",
      });
    }

    const img = `uploads/banners/${image.split("/").pop()}`;

    // normalize audience
    let bannerAudience = "USER";
    if (audienceRaw) {
      const a = String(audienceRaw).toUpperCase();
      if (["USER", "DELIVERY", "DELIVERY_PARTNER", "VENDOR"].includes(a)) {
        bannerAudience = a === "DELIVERY" ? "DELIVERY_PARTNER" : a;
      }
    }

    const newBanner = await prisma.banner.create({
      data: {
        title,
        description,
        image: img,
        audience: bannerAudience,
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
    const audienceParam = (req.query?.audience ?? req.query?.audiance ?? null);
    let where = undefined;
    if (audienceParam) {
      const a = String(audienceParam).toUpperCase();
      const normalized = a === "DELIVERY" ? "DELIVERY_PARTNER" : a;
  if (["USER", "DELIVERY_PARTNER", "VENDOR"].includes(normalized)) {
        where = { audience: normalized };
      }
    }
    const banners = await prisma.banner.findMany({ where });
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
    const audienceRaw = (req.body?.audience ?? req.body?.audiance ?? null);
    const filesByField = indexFiles(req.files);
    let image;
    const imageFile = (filesByField["image"]?.[0]) || (filesByField["banner"]?.[0]) || (filesByField["file"]?.[0]) || null;
    if (imageFile) {
      image = `uploads/banners/${imageFile.filename}`;
    }
    const data = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (image) data.image = image;
    if (audienceRaw) {
      const a = String(audienceRaw).toUpperCase();
      const normalized = a === "DELIVERY" ? "DELIVERY_PARTNER" : a;
      if (["USER", "DELIVERY_PARTNER", "VENDOR"].includes(normalized)) {
        data.audience = normalized;
      }
    }
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
    const { startDate, endDate } = req.query;

    // Build where clause (only start & end date filters)
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate);
        if (isNaN(sd)) return res.status(400).json({ error: "Invalid startDate" });
        where.createdAt.gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate);
        if (isNaN(ed)) return res.status(400).json({ error: "Invalid endDate" });
        ed.setHours(23, 59, 59, 999); // inclusive
        where.createdAt.lte = ed;
      }
    }

    // Stats (interpreting isDeleted: true = Active, false = Deactive as requested)
    const totalUsers = await prisma.user.count({});
    const totalActiveUsers = await prisma.user.count({ where: { isDeleted: true } });
    const totalInactiveUsers = await prisma.user.count({ where: { isDeleted: false } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayRegisteredUsers = await prisma.user.count({
      where: { createdAt: { gte: startOfToday } },
    });

    const users = await prisma.user.findMany({
      where,
      include: { UserAddress: true },
      orderBy: { id: 'desc' },
    });

    const data = users.map(({ password, ...u }) => ({
      ...u,
      status: u.isDeleted ? 'ACTIVE' : 'DEACTIVE', // per instruction
    }));

    return res.json({
      stats: {
        totalUsers,
        todayRegisteredUsers,
        totalActiveUsers,
        totalInactiveUsers,
      },
      filtersApplied: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      data,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
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
    const { startDate, endDate } = req.query;

    // Main list still only APPROVED vendors
    const where = { status: "APPROVED" };

    // Optional createdAt range filter (applies only to APPROVED list)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate);
        if (isNaN(sd)) return res.status(400).json({ error: "Invalid startDate" });
        where.createdAt.gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate);
        if (isNaN(ed)) return res.status(400).json({ error: "Invalid endDate" });
        ed.setHours(23, 59, 59, 999);
        where.createdAt.lte = ed;
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Stats (approved focused) + today (all + unapproved)
    const [
      totalApprovedVendors,
      totalActiveApprovedVendors,
      totalInactiveApprovedVendors,
      todayRegisteredApprovedVendors,
      todayRegisteredAllVendors,
      todayUnapprovedVendors,
      approvedVendorsList
    ] = await Promise.all([
      prisma.vendor.count({ where: { status: "APPROVED" } }),
      prisma.vendor.count({ where: { status: "APPROVED", isActive: true } }),
      prisma.vendor.count({ where: { status: "APPROVED", isActive: false } }),
      prisma.vendor.count({ where: { status: "APPROVED", createdAt: { gte: startOfToday } } }),
      prisma.vendor.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.vendor.findMany({
        where: {
          createdAt: { gte: startOfToday },
          status: { not: "APPROVED" }, // PENDING or REJECTED
        },
        orderBy: { id: "desc" },
      }),
      prisma.vendor.findMany({
        where,
        orderBy: { id: "desc" },
      }),
    ]);

    return res.status(200).json({
      stats: {
        totalApprovedVendors,
        todayRegisteredApprovedVendors,
        totalActiveApprovedVendors,
        totalInactiveApprovedVendors,
        todayRegisteredAllVendors,        // new: all statuses
        todayUnapprovedCount: todayUnapprovedVendors.length,
      },
      todayUnapprovedVendors, // list of today's vendors not yet approved
      filtersApplied: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      data: approvedVendorsList, // approved vendors (filtered by date if provided)
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return res.status(500).json({ error: "Failed to fetch vendors", details: error.message });
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
    const { startDate, endDate } = req.query;

    // Build optional createdAt range filter
    const createdFilter = {};
    if (startDate || endDate) {
      createdFilter.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate);
        if (isNaN(sd)) return res.status(400).json({ error: "Invalid startDate" });
        createdFilter.createdAt.gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate);
        if (isNaN(ed)) return res.status(400).json({ error: "Invalid endDate" });
        ed.setHours(23, 59, 59, 999);
        createdFilter.createdAt.lte = ed;
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalDeliveryPartners,
      totalPendingDeliveryPartners,
      todayRegisteredDeliveryPartners,
      totalActiveDeliveryPartners,
      totalInactiveDeliveryPartners,
      verifiedPartners,
      unverifiedPartners
    ] = await Promise.all([
      prisma.deliveryPartner.count({ where: { ...createdFilter } }),
      prisma.deliveryPartner.count({ where: { ...createdFilter, isVerified: false } }),
      prisma.deliveryPartner.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.deliveryPartner.count({ where: { ...createdFilter, isActive: true } }),
      prisma.deliveryPartner.count({ where: { ...createdFilter, isActive: false } }),
      prisma.deliveryPartner.findMany({ where: { ...createdFilter, isVerified: true }, orderBy: { id: 'desc' } }),
      prisma.deliveryPartner.findMany({ where: { ...createdFilter, isVerified: false }, orderBy: { id: 'desc' } }),
    ]);

    res.status(200).json({
      message: "Delivery partners fetched successfully",
      filtersApplied: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      stats: {
        totalDeliveryPartners,
        totalPendingDeliveryPartners,
        todayRegisteredDeliveryPartners,
        totalActiveDeliveryPartners,
        totalInactiveDeliveryPartners,
      },
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
      return res.status(404).json({ error: "Delivery partner not found" });
    }

    const toggledDeliveryPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        isDeleted: !deliveryPartner.isDeleted,
        deletedAt: deliveryPartner.isDeleted ? null : new Date(),
        // removed isActive mutation
      },
    });

    const status = toggledDeliveryPartner.isDeleted ? "DEACTIVE" : "ACTIVE";

    res.status(200).json({
      message: `Delivery partner has been ${toggledDeliveryPartner.isDeleted ? "soft-deleted" : "restored"} successfully.`,
      data: {
        ...toggledDeliveryPartner,
        status, // derived status (isDeleted false => ACTIVE, true => DEACTIVE)
      },
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

// Post /settings - Create or Update Settings
export const upsertSettings = async (req, res) => {
  const raw = {
    gst: req.body.gst,
    vendorCommission: req.body.vendorCommission,
    deliveryPartnerCommission: req.body.deliveryPartnerCommission,
    adminCommission: req.body.adminCommission,
    deliveryChargePerKm: req.body.deliveryChargePerKm,
    platformCharge: req.body.platformCharge,
    otherCharge: req.body.otherCharge,
  };

  const numericFields = [
    "gst",
    "vendorCommission",
    "deliveryPartnerCommission",
    "adminCommission",
    "deliveryChargePerKm",
    "platformCharge",
    "otherCharge",
  ];

  const errors = [];
  const data = {};

  // Validate & coerce numeric fields (allow undefined -> do not overwrite)
  for (const f of numericFields) {
    const v = raw[f];
    if (v === undefined || v === null || v === "") continue;
    const num = Number(v);
    if (Number.isNaN(num)) {
      errors.push(`${f} must be a valid number`);
      continue;
    }
    if (num < 0) {
      errors.push(`${f} must be >= 0`);
      continue;
    }
    data[f] = num;
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  try {
    // Fetch existing (expecting a single row table)
    const existing = await prisma.settings.findFirst();

    // If no fields provided at all on create attempt
    if (!existing && Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one settings field is required",
      });
    }

    let result;
    let created = false;

    if (existing) {
      if (Object.keys(data).length === 0) {
        return res.status(200).json({
          success: true,
            message: "No changes supplied",
          data: existing,
        });
      }
      result = await prisma.settings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      result = await prisma.settings.create({ data });
      created = true;
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Settings created" : "Settings updated",
      data: result,
    });
  } catch (error) {
    // Prisma known request error handling
    if (error && error.code) {
      return res.status(400).json({
        success: false,
        message: "Database constraint error",
        code: error.code,
        meta: error.meta || null,
      });
    }

    console.error("upsertSettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    return res.json(settings);
  }
  catch (error) {
    console.error("Error fetching settings:", error);
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

// custom notification: send to specific user (any role) and/or broadcast by role
export const sendCustomNotification = async (req, res) => {
  const { role, userId, userIds, title, message } = req.body || {};

  try {
    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({ error: "title and message are required" });
    }

    // Normalize / validate role (optional)
    let normalizedRole = null;
    if (role) {
      const roleUpper = String(role).toUpperCase();
      if (roleUpper === "DELIVERY") normalizedRole = "DELIVERY_PARTNER";
      else if (["USER", "VENDOR", "DELIVERY_PARTNER", "ADMIN"].includes(roleUpper)) normalizedRole = roleUpper;
      else return res.status(400).json({ error: "Invalid role. Use USER, VENDOR, DELIVERY_PARTNER, or ADMIN" });
    }

    // Support single userId OR multiple userIds
    let targetUserIds = [];

    if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds
        .map(u => parseInt(u))
        .filter(v => !isNaN(v));
      if (targetUserIds.length === 0) {
        return res.status(400).json({ error: "userIds must contain at least one valid number" });
      }
    } else if (userId !== undefined && userId !== null && userId !== "") {
      const single = parseInt(userId);
      if (isNaN(single)) return res.status(400).json({ error: "userId must be a number" });
      targetUserIds = [single];
    }

    if (!normalizedRole && targetUserIds.length === 0) {
      return res.status(400).json({ error: "Provide at least one target: role or userId(s)" });
    }

    // CASE 1: Broadcast to a role (no specific userIds)
    if (normalizedRole && targetUserIds.length === 0) {
      const notification = await prisma.notification.create({
        data: {
          title,
            message,
          role: normalizedRole,
          userId: null,
        },
      });
      return res.status(201).json({ message: "Role broadcast created", data: [notification] });
    }

    // CASE 2: Multiple (or single) specific users
    const created = [];
    for (const uid of targetUserIds) {
      const notif = await prisma.notification.create({
        data: {
          title,
          message,
          role: normalizedRole || null, // keep role if provided, else null (direct user notification)
          userId: uid,
        },
      });
      created.push(notif);
    }

    return res
      .status(201)
      .json({
        message: `Notification sent to ${created.length} user(s)${normalizedRole ? " (role tag applied)" : ""}`,
        count: created.length,
        data: created,
      });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


export const getAllSupportTicketsGroupedById = async (req, res) => {
  try {
    const adminId = req.user?.id;

    // Optionally: verify admin in DB if needed
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });

    if (!admin) {
      return res.status(403).json({ error: 'Access denied. Only admins can view all tickets.' });
    }

    const tickets = await prisma.supportTicket.findMany({
      // where: {
      //   status: { not: 'CLOSED' },
      // },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = [];
    const vendors = [];
    const deliveryPartners = [];

    for (const ticket of tickets) {
      if (ticket.role === 'USER') users.push(ticket);
      else if (ticket.role === 'VENDOR') vendors.push(ticket);
      else if (ticket.role === 'DELIVERY') deliveryPartners.push(ticket);
    }

    return res.status(200).json({
      users,
      vendors,
      deliveryPartners,
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllScheduledOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "PENDING",
        mealSchedules: {
          some: {
            status: "SCHEDULED"
          }
        }
      },
      include: {
        mealSchedules : true
      }
    })
    
    // Extract all meal schedules from all orders
    const allMealSchedules = [];
    
    orders.forEach(order => {
      order.mealSchedules.forEach(mealSchedule => {
        allMealSchedules.push({
          ...mealSchedule,
          orderId: order.id,
          orderType: order.orderType
        });
      });
    });
    
    // Group all meal schedules by date
    const mealsByDate = {};
    
    allMealSchedules.forEach(mealSchedule => {
      // Handle scheduledDate - it could be a Date object or string
      let dateKey;
      if (mealSchedule.scheduledDate instanceof Date) {
        // If it's a Date object, format it to YYYY-MM-DD
        dateKey = mealSchedule.scheduledDate.toISOString().split('T')[0];
      } else if (typeof mealSchedule.scheduledDate === 'string') {
        // If it's already a string, extract the date part
        dateKey = mealSchedule.scheduledDate.split('T')[0];
      } else {
        // Skip if scheduledDate is null/undefined
        return;
      }
      
      if (!mealsByDate[dateKey]) {
        mealsByDate[dateKey] = [];
      }
      
      mealsByDate[dateKey].push(mealSchedule);
    });
    
    // Convert to array format with date and meals
    const groupedMeals = Object.keys(mealsByDate).map(date => ({
      scheduledDate: date,
      meals: mealsByDate[date]
    }));
    
    // Sort by date
    groupedMeals.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    
    return res.status(200).json({ mealSchedules: groupedMeals });t
  }
  catch (error) {
    console.error("Error fetching scheduled orders:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};















