import { PrismaClient } from "@prisma/client";
import axios from "axios";
const prisma = new PrismaClient();

/**
 * Add meal to cart
 * Handles both SINGLE and CUSTOMIZABLE meals
 * @route POST /cart/add
 * @access User
 */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mealId,
      quantity = 1,
      selectedOptions = [],
      deliveryDate,
    } = req.body;

    if (!mealId) {
      return res.status(400).json({
        success: false,
        message: "Meal ID is required",
      });
    }

    // Fetch meal details with all necessary relations
    const meal = await prisma.meal.findUnique({
      where: {
        id: Number(mealId),
        isAvailable: true,
        isDeleted: false,
      },
      include: {
        mealOptionGroups: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found or not available",
      });
    }

    // Calculate total price
    let totalPrice = meal.basePrice * quantity;
    let validatedOptions = [];

    // Handle customizable meals
    if (meal.configType === "CUSTOMIZABLE") {
      if (!selectedOptions || selectedOptions.length === 0) {
        // Check if there are required option groups
        const requiredGroups = meal.mealOptionGroups.filter(
          (group) => group.isRequired
        );
        if (requiredGroups.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Required options must be selected for customizable meals",
            requiredGroups: requiredGroups.map((group) => ({
              id: group.id,
              title: group.title,
              minSelect: group.minSelect,
              maxSelect: group.maxSelect,
            })),
          });
        }
      }

      // Validate selected options
      for (const selectedOption of selectedOptions) {
        const { optionId, quantity: optionQuantity = 1 } = selectedOption;

        // Find the option and its group
        const option = await prisma.mealOption.findUnique({
          where: { id: Number(optionId) },
          include: { optionGroup: true },
        });

        if (!option || option.optionGroup.mealId !== meal.id) {
          return res.status(400).json({
            success: false,
            message: `Invalid option selected: ${optionId}`,
          });
        }

        validatedOptions.push({
          optionId: Number(optionId),
          quantity: optionQuantity,
          price: option.price,
        });

        totalPrice += option.price * optionQuantity * quantity;
      }

      // Validate option group constraints
      const groupValidation = validateOptionGroups(
        meal.mealOptionGroups,
        selectedOptions
      );
      if (!groupValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: groupValidation.message,
        });
      }
    }

    // Check if cart has items from different vendor
    const existingCartItems = await prisma.cartItem.findMany({
      where: { userId: userId },
      include: {
        meal: {
          select: {
            vendorId: true,
          },
        },
      },
    });

    // If cart has items and they're from a different vendor, clear the cart first
    if (existingCartItems.length > 0) {
      const existingVendorId = existingCartItems[0].meal.vendorId;
      if (existingVendorId !== meal.vendorId) {
        // Clear cart - different vendor detected
        await prisma.cartItem.deleteMany({
          where: { userId: userId },
        });
        console.log(
          `Cart cleared for user ${userId} - switching from vendor ${existingVendorId} to vendor ${meal.vendorId}`
        );
      }
    }

    // Check if item already exists in cart (after potential clearing)
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_mealId: {
          userId: userId,
          mealId: Number(mealId),
        },
      },
    });

    let cartItem;

    if (existingCartItem) {
      // Update existing cart item
      await prisma.cartItemOption.deleteMany({
        where: { cartItemId: existingCartItem.id },
      });

      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: quantity,
          totalPrice: totalPrice,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          selectedOptions: {
            create: validatedOptions,
          },
        },
        include: {
          meal: {
            select: {
              id: true,
              title: true,
              image: true,
              basePrice: true,
              configType: true,
              type: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  businessName: true,
                },
              },
            },
          },
          selectedOptions: {
            include: {
              cartItem: false,
            },
          },
        },
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          userId: userId,
          mealId: Number(mealId),
          quantity: quantity,
          totalPrice: totalPrice,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          selectedOptions: {
            create: validatedOptions,
          },
        },
        include: {
          meal: {
            select: {
              id: true,
              title: true,
              image: true,
              basePrice: true,
              configType: true,
              type: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  businessName: true,
                },
              },
            },
          },
          selectedOptions: {
            include: {
              cartItem: false,
            },
          },
        },
      });
    }

    // Determine response message
    let responseMessage;
    if (
      existingCartItems.length > 0 &&
      existingCartItems[0].meal.vendorId !== meal.vendorId
    ) {
      responseMessage =
        "Previous cart items were cleared. Item added from new restaurant successfully";
    } else if (existingCartItem) {
      responseMessage = "Cart item updated successfully";
    } else {
      responseMessage = "Item added to cart successfully";
    }

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: cartItem,
      meta: {
        currentVendorId: meal.vendorId,
        wasCartCleared:
          existingCartItems.length > 0 &&
          existingCartItems[0].meal.vendorId !== meal.vendorId,
      },
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get user's cart items
 * @route GET /cart
 * @access User
 */
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: userId },
      include: {
        meal: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                businessName: true,
                logo: true,
                latitude: true,
                longitude: true,
              },
            },
            mealImages: true,
          },
        },
        selectedOptions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate cart summary
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    let totalAmount = cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    const totalitemcost = totalAmount;

    // Get user location
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
      },
    });

    // Calculate delivery fee based on distance
    let deliveryCost = 0;
    let distance = 0;

    if (cartItems.length > 0 && user && user.latitude && user.longitude) {
      // Get vendor from first cart item (all items should be from same vendor)
      const vendor = cartItems[0].meal.vendor;

      if (vendor.latitude && vendor.longitude) {
        // Calculate distance between user and vendor
        const distanceData = await getDrivingDistance(
          user.latitude,
          user.longitude,
          vendor.latitude,
          vendor.longitude
        );

        if (distanceData) {
          distance = distanceData.distanceKm;

          // Get delivery charge per km from settings
          const setting = await prisma.settings.findFirst();
          const deliveryFeePerKm = setting?.deliveryChargePerKm || 0;

          // Calculate delivery cost
          deliveryCost = distance * deliveryFeePerKm;
        }
      }
    }

    totalAmount += deliveryCost;

    // Group items by vendor
    const itemsByVendor = cartItems.reduce((acc, item) => {
      const vendorId = item.meal.vendor.id;
      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendor: item.meal.vendor,
          items: [],
          vendorTotal: 0,
        };
      }
      acc[vendorId].items.push(item);
      acc[vendorId].vendorTotal += item.totalPrice;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        items: cartItems,
        summary: {
          totalitemcost,
          totalItems,
          totalAmount,
          deliveryCost,
          distanceKm: distance,
          vendorCount: Object.keys(itemsByVendor).length,
        },
        itemsByVendor: Object.values(itemsByVendor),
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update cart item quantity
 * @route PATCH /cart/:cartItemId
 * @access User
 */
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity, deliveryDate } = req.body;

    // Validate cartItemId
    if (!cartItemId || isNaN(Number(cartItemId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID",
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // Find cart item and verify ownership
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: Number(cartItemId) },
      include: {
        meal: true,
        selectedOptions: true,
      },
    });

    if (!cartItem || cartItem.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Recalculate total price
    let basePrice = cartItem.meal.basePrice * quantity;
    let optionsPrice = cartItem.selectedOptions.reduce(
      (sum, option) => sum + option.price * option.quantity * quantity,
      0
    );
    const totalPrice = basePrice + optionsPrice;

    // Update cart item
    const updatedCartItem = await prisma.cartItem.update({
      where: { id: Number(cartItemId) },
      data: {
        quantity: quantity,
        totalPrice: totalPrice,
        deliveryDate: deliveryDate
          ? new Date(deliveryDate)
          : cartItem.deliveryDate,
      },
      include: {
        meal: {
          select: {
            id: true,
            title: true,
            image: true,
            basePrice: true,
            configType: true,
            type: true,
            vendor: {
              select: {
                id: true,
                name: true,
                businessName: true,
              },
            },
          },
        },
        selectedOptions: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: updatedCartItem,
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Remove item from cart
 * @route DELETE /cart/:cartItemId
 * @access User
 */
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    // Validate cartItemId
    if (!cartItemId || isNaN(Number(cartItemId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID",
      });
    }

    // Find and verify cart item ownership
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: Number(cartItemId) },
    });

    if (!cartItem || cartItem.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Delete cart item (cascade will delete related options)
    await prisma.cartItem.delete({
      where: { id: Number(cartItemId) },
    });

    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Clear entire cart
 * @route DELETE /cart/clear
 * @access User
 */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.cartItem.deleteMany({
      where: { userId: userId },
    });

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get cart summary/count
 * @route GET /cart/summary
 * @access User
 */
export const getCartSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: userId },
      select: {
        quantity: true,
        totalPrice: true,
        meal: {
          select: {
            vendor: {
              select: {
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    // Get user location
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
      },
    });

    // Calculate delivery fee based on distance
    let deliveryCost = 0;
    let distance = 0;

    if (cartItems.length > 0 && user && user.latitude && user.longitude) {
      // Get vendor from first cart item (all items should be from same vendor)
      const vendor = cartItems[0].meal.vendor;

      if (vendor.latitude && vendor.longitude) {
        // Calculate distance between user and vendor
        const distanceData = await getDrivingDistance(
          user.latitude,
          user.longitude,
          vendor.latitude,
          vendor.longitude
        );

        if (distanceData) {
          distance = distanceData.distanceKm;

          // Get delivery charge per km from settings
          const setting = await prisma.settings.findFirst();
          const deliveryFeePerKm = setting?.deliveryChargePerKm || 0;

          // Calculate delivery cost
          deliveryCost = distance * deliveryFeePerKm;
        }
      }
    }

    const totalWithDelivery = totalAmount + deliveryCost;

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        totalAmount: totalWithDelivery,
        itemCount: cartItems.length,
        deliveryCost,
        distanceKm: distance,
      },
    });
  } catch (error) {
    console.error("Error fetching cart summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper function to validate option groups
function validateOptionGroups(optionGroups, selectedOptions) {
  const groupValidation = {};

  // Count selections per group
  for (const option of selectedOptions) {
    const group = optionGroups.find((g) =>
      g.options.some((opt) => opt.id === Number(option.optionId))
    );

    if (group) {
      if (!groupValidation[group.id]) {
        groupValidation[group.id] = {
          group: group,
          count: 0,
        };
      }
      groupValidation[group.id].count += option.quantity || 1;
    }
  }

  // Validate each group
  for (const group of optionGroups) {
    const validation = groupValidation[group.id];
    const count = validation ? validation.count : 0;

    // Check required groups
    if (group.isRequired && count === 0) {
      return {
        isValid: false,
        message: `${group.title} is required. Please select at least ${group.minSelect || 1
          } option(s).`,
      };
    }

    // Check minimum selections
    if (group.minSelect && count < group.minSelect) {
      return {
        isValid: false,
        message: `${group.title} requires at least ${group.minSelect} selection(s). You selected ${count}.`,
      };
    }

    // Check maximum selections
    if (group.maxSelect && count > group.maxSelect) {
      return {
        isValid: false,
        message: `${group.title} allows maximum ${group.maxSelect} selection(s). You selected ${count}.`,
      };
    }
  }

  return { isValid: true };
}

// Helper function to calculate driving distance using Google Maps API
async function getDrivingDistance(userLat, userLng, restLat, restLng) {
  try {
    console.log("Fetching driving distance...", userLat, userLng, restLat, restLng);

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    console.log(apiKey);

    if (!apiKey) {
      console.warn("GOOGLE_MAPS_API_KEY not found in environment variables");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${userLat},${userLng}&destinations=${restLat},${restLng}&mode=driving&key=${apiKey}`;

    const res = await axios.get(url);
    console.log("Distance matrix response:", data);
    const data = res.data;

    if (data.rows[0].elements[0].status === "OK") {
      const distanceText = data.rows[0].elements[0].distance.text; // "12.3 km"
      const distanceValue = data.rows[0].elements[0].distance.value; // in meters
      const duration = data.rows[0].elements[0].duration.text; // "25 mins"

      return {
        distanceKm: distanceValue / 1000,
        distanceText,
        duration,
      };
    } else {
      throw new Error("No route found");
    }
  } catch (err) {
    console.error("Error fetching distance:", err.message);
    return null;
  }
}




