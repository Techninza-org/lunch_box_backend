import { PrismaClient } from "@prisma/client";
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

    // Check if item already exists in cart
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

    res.status(200).json({
      success: true,
      message: existingCartItem
        ? "Cart item updated successfully"
        : "Item added to cart successfully",
      data: cartItem,
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
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

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
          totalItems,
          totalAmount,
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
      },
    });

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        totalAmount,
        itemCount: cartItems.length,
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
        message: `${group.title} is required. Please select at least ${
          group.minSelect || 1
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
