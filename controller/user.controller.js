import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const addUserCurrentLocation = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is set in req.user by auth middleware
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user's latitude and longitude
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        latitude,
        longitude,
      },
    });

    res.status(200).json({
      success: true,
      message: "User location updated successfully",
    });
  } catch (error) {
    console.error("Error updating user location:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get home page
export const getHomePage = async (req, res) => {
  try {
    // Fetch necessary data for the home page
    const banners = await prisma.banner.findMany();

    const vendors = await prisma.vendor.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        businessName: true,
        gallery: true,
        description: true,
        logo: true,
        isActive: true,
        createdAt: true,
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

    res.status(200).json({
      success: true,
      data: {
        banners,
        vendors,
      },
    });
  } catch (error) {
    console.error("Error fetching home page data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all restaurants by user location
export const getAllRestaurantsByUserLocation = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is set in req.user by auth middleware
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { latitude: true, longitude: true },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch vendors based on user's location
    const vendors = await prisma.vendor.findMany({
      //   where: {
      //     latitude: user.latitude,
      //     longitude: user.longitude,
      //   },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        businessName: true,
        description: true,
        logo: true,
        breakfastStart: true,
        breakfastEnd: true,
        lunchStart: true,
        lunchEnd: true,
        eveningStart: true,
        eveningEnd: true,
        dinnerStart: true,
        dinnerEnd: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    console.error("Error fetching vendors by user location:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get restaurant by ID
export const getRestaurantsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
    }

    // Fetch vendor details
    const vendor = await prisma.vendor.findUnique({
      where: {
        id: Number(id),
        status: "APPROVED",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        businessName: true,
        gallery: true,
        description: true,
        logo: true,
        address: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        breakfastStart: true,
        breakfastEnd: true,
        lunchStart: true,
        lunchEnd: true,
        eveningStart: true,
        eveningEnd: true,
        dinnerStart: true,
        dinnerEnd: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Fetch all meals for this vendor grouped by meal type
    const meals = await prisma.meal.findMany({
      where: {
        vendorId: Number(id),
        isAvailable: true,
        isDeleted: false,
      },
      include: {
        mealImages: true, // Gallery images
        mealOptionGroups: {
          include: {
            options: true, // Options for customizable meals
          },
        },
        availableDays: true, // Available days
        dietaryTags: true, // Dietary tags
        ingredients: true, // Ingredients
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group meals by type
    const menuCategories = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Evening: [],
    };

    meals.forEach((meal) => {
      if (menuCategories[meal.type]) {
        menuCategories[meal.type].push({
          id: meal.id,
          title: meal.title,
          description: meal.description,
          image: meal.image,
          type: meal.type,
          configType: meal.configType, // SINGLE or CUSTOMIZABLE
          cuisine: meal.cuisine,
          isVeg: meal.isVeg,
          // Nutrition info
          energyKcal: meal.energyKcal,
          proteinGram: meal.proteinGram,
          fatGram: meal.fatGram,
          fiberGram: meal.fiberGram,
          carbsGram: meal.carbsGram,
          basePrice: meal.basePrice,
          isAvailable: meal.isAvailable,
          isWeekly: meal.isWeekly,
          // Related data
          gallery: meal.mealImages,
          customizationOptions: meal.mealOptionGroups, // For customizable meals
          availableDays: meal.availableDays,
          dietaryTags: meal.dietaryTags,
          ingredients: meal.ingredients,
          createdAt: meal.createdAt,
          updatedAt: meal.updatedAt,
        });
      }
    });

    // Structure the response
    const restaurantData = {
      vendorInfo: vendor,
      menu: menuCategories,
      totalItems: meals.length,
    };

    res.status(200).json({
      success: true,
      data: restaurantData,
    });
  } catch (error) {
    console.error("Error fetching restaurant by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get meals by vendor ID and meal type
export const getMealsByVendorAndType = async (req, res) => {
  try {
    const { vendorId, type } = req.params;

    if (!vendorId || !type) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID and meal type are required",
      });
    }

    const meals = await prisma.meal.findMany({
      where: {
        vendorId: Number(vendorId),
        type: type,
        isAvailable: true,
        isDeleted: false,
      },
      include: {
        mealImages: true,
        mealOptionGroups: {
          include: {
            options: true,
          },
        },
        availableDays: true,
        dietaryTags: true,
        ingredients: true,
      },
      orderBy: {
        basePrice: "asc",
      },
    });

    res.status(200).json({
      success: true,
      data: meals,
      count: meals.length,
    });
  } catch (error) {
    console.error("Error fetching meals by vendor and type:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Search meals by title or description
export const searchMeals = async (req, res) => {
  try {
    const { query, type, cuisine, isVeg, priceMin, priceMax, vendorId } =
      req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const whereConditions = {
      isAvailable: true,
      isDeleted: false,
      OR: [
        {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    };

    // Add optional filters
    if (type) whereConditions.type = type;
    if (cuisine) whereConditions.cuisine = cuisine;
    if (isVeg !== undefined) whereConditions.isVeg = isVeg === "true";
    if (vendorId) whereConditions.vendorId = Number(vendorId);
    if (priceMin || priceMax) {
      whereConditions.basePrice = {};
      if (priceMin) whereConditions.basePrice.gte = parseFloat(priceMin);
      if (priceMax) whereConditions.basePrice.lte = parseFloat(priceMax);
    }

    const meals = await prisma.meal.findMany({
      where: whereConditions,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            logo: true,
          },
        },
        mealImages: true,
        mealOptionGroups: {
          include: {
            options: true,
          },
        },
        availableDays: true,
        dietaryTags: true,
        ingredients: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: meals,
      count: meals.length,
    });
  } catch (error) {
    console.error("Error searching meals:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get meal details by ID
export const getMealById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Meal ID is required",
      });
    }

    const meal = await prisma.meal.findUnique({
      where: {
        id: Number(id),
        isAvailable: true,
        isDeleted: false,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            logo: true,
            address: true,
            city: true,
            state: true,
          },
        },
        mealImages: true,
        mealOptionGroups: {
          include: {
            options: true,
          },
        },
        availableDays: true,
        dietaryTags: true,
        ingredients: true,
      },
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: meal,
    });
  } catch (error) {
    console.error("Error fetching meal by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// add address
export const addAddress = async (req, res) => {
  try {
    const { address, city, state, zipCode, longitude, latitude, phoneNumber } =
      req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    if (
      !address ||
      !city ||
      !state ||
      !zipCode ||
      longitude == null ||
      latitude == null ||
      !phoneNumber
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Set all existing addresses' isDefault = false
      await tx.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      // Create new address as default
      const newAddress = await tx.userAddress.create({
        data: {
          userId,
          address,
          city,
          state,
          zipCode,
          phoneNumber,
          longitude,
          latitude,
          isDefault: true,
        },
      });

      return newAddress;
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully and set as default.",
      data: result,
    });
  } catch (error) {
    console.error("Add Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
