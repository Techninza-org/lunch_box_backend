import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { saveNotification } from "../utils/saveNotification.js";

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
  // Fetch necessary data for the home page (user audience banners only)
  const banners = await prisma.banner.findMany({ where: { audience: "USER", isActive: true } });

    const vendors = await prisma.vendor.findMany({
      where: { status: "APPROVED", isDeleted: false, isActive: true },
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
      where: {
        isActive: true,
        status: "APPROVED",
        isDeleted: false,
      },
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
    console.log(id);
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
            // mode: "insensitive",
          },
        },
        {
          description: {
            contains: query,
            // mode: "insensitive",
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
      where: {
        isAvailable: true,
        isDeleted: false,
        OR: [
          {
            title: {
              contains: query.toLowerCase(),
            },
          },
          {
            description: {
              contains: query.toLowerCase(),
            },
          },
        ],
      },
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
            // Include all timing fields
            breakfastStart: true,
            breakfastEnd: true,
            lunchStart: true,
            lunchEnd: true,
            eveningStart: true,
            eveningEnd: true,
            dinnerStart: true,
            dinnerEnd: true,
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

    // Add timing information based on meal type
    let timing = null;
    if (meal.vendor) {
      switch (meal.type) {
        case "Breakfast":
          timing = {
            start: meal.vendor.breakfastStart,
            end: meal.vendor.breakfastEnd,
          };
          break;
        case "Lunch":
          timing = {
            start: meal.vendor.lunchStart,
            end: meal.vendor.lunchEnd,
          };
          break;
        case "Evening":
          timing = {
            start: meal.vendor.eveningStart,
            end: meal.vendor.eveningEnd,
          };
          break;
        case "Dinner":
          timing = {
            start: meal.vendor.dinnerStart,
            end: meal.vendor.dinnerEnd,
          };
          break;
        default:
          timing = null;
      }
    }

    // Prepare response data with timing information
    const responseData = {
      ...meal,
      timing,
    };

    res.status(200).json({
      success: true,
      data: responseData,
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

    // Check if user has any existing addresses
    const existingAddresses = await prisma.userAddress.findMany({
      where: { userId },
    });

    const result = await prisma.$transaction(async (tx) => {
      // Only set existing addresses to non-default if user has addresses
      if (existingAddresses.length > 0) {
        await tx.userAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      // Create new address
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
          // Set as default only if user has no existing addresses
          isDefault: existingAddresses.length === 0,
        },
      });

      return newAddress;
    });

    const message = existingAddresses.length === 0
      ? "Address added successfully and set as default."
      : "Address added successfully.";

    return res.status(201).json({
      success: true,
      message,
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

// Set an address as default by address ID
export const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    if (!addressId || isNaN(parseInt(addressId))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid address ID is required" });
    }

    // Check if the address exists and belongs to the user
    const address = await prisma.userAddress.findFirst({
      where: {
        id: parseInt(addressId),
        userId: userId
      },
    });

    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found or doesn't belong to user" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Set all existing addresses' isDefault = false
      await tx.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      // Set the selected address as default
      const updatedAddress = await tx.userAddress.update({
        where: { id: parseInt(addressId) },
        data: { isDefault: true },
      });

      return updatedAddress;
    });

    return res.status(200).json({
      success: true,
      message: "Address set as default successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Set Default Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Get user addresses
export const getAddress = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const addresses = await prisma.userAddress.findMany({
      where: { userId },
    });

    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete user address
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!addressId || isNaN(parseInt(addressId))) {
      return res.status(400).json({
        success: false,
        message: "Valid address ID is required",
      });
    }

    // Check if the address exists and belongs to the user
    const address = await prisma.userAddress.findFirst({
      where: {
        id: parseInt(addressId),
        userId: userId,
      },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or doesn't belong to user",
      });
    }

    // Check if this is the only address for the user
    const userAddressCount = await prisma.userAddress.count({
      where: { userId },
    });

    if (userAddressCount === 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the only address. Please add another address first.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete the address
      await tx.userAddress.delete({
        where: { id: parseInt(addressId) },
      });

      // If the deleted address was default, set another address as default
      if (address.isDefault) {
        const firstRemainingAddress = await tx.userAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });

        if (firstRemainingAddress) {
          await tx.userAddress.update({
            where: { id: firstRemainingAddress.id },
            data: { isDefault: true },
          });
        }
      }

      return { deletedAddressId: parseInt(addressId) };
    });

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Delete Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

export const getUserNotifications = async (req, res) => {
  const userId = req.user?.id;

  if (!userId || isNaN(userId)) {
    return res.status(401).json({ message: "Unauthorized or invalid user ID" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: userId }, { role: "USER" }],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  const id = req.user?.id;
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const {
    name,
    // email,  <- users should not update email
    phoneNumber,
    gender,
    // longitude,
    // latitude,
  } = req.body;

  const profileImage = req.file ? req.file.filename : null;

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser || existingUser.isDeleted) {
      return res.status(404).json({ message: "User not found or deleted" });
    }

    // Check phone number uniqueness
    if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
      const phoneExists = await prisma.user.findFirst({
        where: { phoneNumber, NOT: { id } },
      });
      if (phoneExists) {
        return res.status(409).json({ message: "Phone number already in use" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        phoneNumber,
        gender,
        // longitude: longitude ? parseFloat(longitude) : undefined,
        // latitude: latitude ? parseFloat(latitude) : undefined,
        profileImage: profileImage
          ? `uploads/users/${profileImage}`
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        gender: true,
        profileImage: true,
        longitude: true,
        latitude: true,
        updatedAt: true,
      },
    });

    // ✅ Save notification
    await saveNotification({
      title: "Profile Updated",
      message: "Your user profile was successfully updated.",
      userId: id,
      role: "USER",
    });

    res.status(200).json({
      message: "User profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserProfile = async (req, res) => {
  const id = req.user?.id;

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        gender: true,
        profileImage: true,
        // longitude: true,
        // latitude: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found or deleted" });
    }

    res.status(200).json({
      message: "User profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getVendorsByMealType = async (req, res) => {
  try {
    let { type } = req.query;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Meal type is required (e.g., lunch or dinner).",
      });
    }

    // Convert to uppercase to match enum values
    // type = type.toUpperCase();

    const vendors = await prisma.vendor.findMany({
      where: {
        Meal: {
          some: {
            type: type,
            isDeleted: false,
            isVerified: true,
          },
        },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: false, // don’t include password in API response
        phoneNumber: true,
        phoneNumber2: true,
        businessName: true,
        logo: true,
        gallery: true,
        description: true,
        address: true,
        city: true,
        state: true,
        longitude: true,
        latitude: true,
        breakfastStart: true,
        breakfastEnd: true,
        lunchStart: true,
        lunchEnd: true,
        eveningStart: true,
        eveningEnd: true,
        dinnerStart: true,
        dinnerEnd: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        otp: false, // hide OTP info
        otp_expiry: false, // hide OTP expiry
        otp_verified: false, // hide OTP verified
        VendorBankDetail: true,
        Meal: {
          where: {
            type: type,
            isDeleted: false,
            isVerified: true,
          },
          select: {
            id: true,
            title: true,
            basePrice: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error("Error fetching vendors by meal type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching vendors.",
    });
  }
};

export const getMealsByType = async (req, res) => {
  try {
    const { type } = req.params;

    // Validate meal type
    const validMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Evening'];
    if (!validMealTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal type. Valid types are: Breakfast, Lunch, Dinner, Evening",
      });
    }

    // Fetch meals of the specified type with minimal filters
    const meals = await prisma.meal.findMany({
      where: {
        type: type,
        isAvailable: true,
        isDeleted: false,
        // Remove verification and vendor status filters for now
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            logo: true,
            // Include timing information based on meal type
            breakfastStart: true,
            breakfastEnd: true,
            lunchStart: true,
            lunchEnd: true,
            eveningStart: true,
            eveningEnd: true,
            dinnerStart: true,
            dinnerEnd: true,
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

    // Add timing information to each meal based on its type
    const mealsWithTiming = meals.map(meal => {
      if (meal.vendor) {
        let timing = null;
        switch (meal.type) {
          case "Breakfast":
            timing = {
              start: meal.vendor.breakfastStart,
              end: meal.vendor.breakfastEnd,
            };
            break;
          case "Lunch":
            timing = {
              start: meal.vendor.lunchStart,
              end: meal.vendor.lunchEnd,
            };
            break;
          case "Evening":
            timing = {
              start: meal.vendor.eveningStart,
              end: meal.vendor.eveningEnd,
            };
            break;
          case "Dinner":
            timing = {
              start: meal.vendor.dinnerStart,
              end: meal.vendor.dinnerEnd,
            };
            break;
          default:
            timing = null;
        }

        return {
          ...meal,
          timing,
        };
      }
      return meal;
    });

    res.status(200).json({
      success: true,
      data: mealsWithTiming,
      count: mealsWithTiming.length,
    });
  } catch (error) {
    console.error("Error fetching meals by type:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message, // Include error message for debugging
    });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealId } = req.body;

    if (!mealId) {
      return res.status(400).json({ error: "mealId is required" });
    }

    // Prevent duplicates
    const existing = await prisma.wishlist.findUnique({
      where: { userId_mealId: { userId, mealId } },
    });
    if (existing) {
      return res.status(400).json({ error: "Item already in wishlist" });
    }

    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        mealId,
      },
    });

    res.status(201).json({ success: true, data: wishlistItem });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealId } = req.body;

    if (!mealId) {
      return res.status(400).json({ error: "mealId is required" });
    }

    const deleted = await prisma.wishlist.deleteMany({
      where: { userId, mealId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "Item not found in wishlist" });
    }

    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: { meal: true }, // include meal details
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: wishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFilteredMeals = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "Vendor ID required" });
    }

    const { isVeg, cuisine, sort } = req.query;
    // Example: ?isVeg=true&cuisine=Indian&sort=price_desc

    // Build filter conditions
    const filters = {
      vendorId,
      isDeleted: false,
      isAvailable: true,
    };

    if (isVeg !== undefined) {
      filters.isVeg = isVeg === "true";
    }

    if (cuisine) {
      filters.cuisine = {
        contains: cuisine,
        // mode: "insensitive" 
      };
    }

    // Handle sorting
    let orderBy = { createdAt: "desc" }; // default
    if (sort === "price_asc") {
      orderBy = { basePrice: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { basePrice: "desc" };
    }

    // Fetch meals with relations
    const meals = await prisma.meal.findMany({
      where: filters,
      include: {
        mealImages: true,
        mealOptionGroups: true,
        dietaryTags: true,
        ingredients: true,
        availableDays: true,
      },
      orderBy,
    });

    // Split into breakfast, lunch, dinner
    const breakfast = meals.filter((meal) => meal.type === "Breakfast");
    const lunch = meals.filter((meal) => meal.type === "Lunch");
    const dinner = meals.filter((meal) => meal.type === "Dinner");

    res.json({
      success: true,
      data: {
        breakfast,
        lunch,
        dinner,
        all: meals,
      },
    });
  } catch (error) {
    console.error("Error in getFilteredMeals:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const debugMealData = async (req, res) => {
  try {
    // Get counts of different meal types
    const mealTypeCounts = await prisma.meal.groupBy({
      by: ['type'],
      _count: {
        _all: true,
      },
    });

    // Get counts of meals by availability
    const availabilityCounts = await prisma.meal.groupBy({
      by: ['isAvailable'],
      _count: {
        _all: true,
      },
    });

    // Get counts of meals by verification status
    const verificationCounts = await prisma.meal.groupBy({
      by: ['isVerified'],
      _count: {
        _all: true,
      },
    });

    // Get counts of meals by deletion status
    const deletionCounts = await prisma.meal.groupBy({
      by: ['isDeleted'],
      _count: {
        _all: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        mealTypeCounts,
        availabilityCounts,
        verificationCounts,
        deletionCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching debug meal data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};




