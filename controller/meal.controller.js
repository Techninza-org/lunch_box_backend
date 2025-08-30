import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Helper to index files by fieldname
function indexFiles(files) {
  const map = {};
  if (!files) return map;
  for (const file of files) {
    map[file.fieldname] = file;
  }
  return map;
}

// Add a new meal for a vendor
// This API handles file uploads, meal details, options, tags, and more
/**
 * Add a new meal for a vendor
 * Handles file uploads, meal details, options, tags, and more
 * @route POST /meals
 * @access Vendor
 */
// export const addVendorMeal = async (req, res) => {
//   try {
//     // Step 1: Index uploaded files by their fieldname for easy access
//     // This helps to quickly retrieve files like mainImage, gallery images, and option images
//     const filesByField = indexFiles(req.files);
//     const vendorId = req.user.id;

//     // Step 2: Extract all meal-related fields from the request body
//     // These include basic info, nutrition, options, tags, etc.
//     const {
//       // vendorId, // Vendor's ID (required)
//       title, // Meal title (required)
//       description, // Meal description (optional)
//       type, // Meal type (lunch, dinner, etc.)
//       configType, // SINGLE or CUSTOMIZABLE
//       cuisine, // Cuisine type
//       isVeg, // Is vegetarian ("true"/"false" or "1"/"0")
//       energyKcal, // Nutrition info (optional)
//       proteinGram,
//       fatGram,
//       fiberGram,
//       carbsGram,
//       basePrice, // Base price (required)
//       isWeekly, // Is weekly meal ("true"/"false")
//       availableDays, // Comma-separated days (e.g., "MON,TUE")
//       optionGroups, // JSON string of option groups (for CUSTOMIZABLE)
//       dietaryTags, // JSON string of dietary tags
//       ingredients, // JSON string of ingredients
//     } = req.body;

//     // Step 3: Handle main meal image (thumbnail)
//     // The fieldname should be "mainImage" in the upload
//     const mainFile = filesByField["mainImage"];
//     // If main image is uploaded, set its path, else null
//     const image = mainFile ? `/uploads/meals/${mainFile.filename}` : null;

//     // Step 4: Handle gallery images (multiple files, fieldnames like gallery_0, gallery_1, ...)
//     // Collect all files whose fieldname starts with "gallery_"
//     const galleryFiles = Object.keys(filesByField)
//       .filter((key) => key.startsWith("gallery_"))
//       .map((key) => filesByField[key]);

//     // Step 5: Build the base meal data object for Prisma
//     // This includes all scalar fields and nested relations
//     const data = {
//       vendorId: Number(vendorId), // Convert vendorId to number
//       title,
//       description,
//       image, // Main image URL or null
//       type,
//       configType,
//       cuisine,
//       isVeg: isVeg === "true" || isVeg === "1", // Convert to boolean
//       energyKcal: energyKcal ? +energyKcal : undefined, // Convert to number if present
//       proteinGram: proteinGram ? +proteinGram : undefined,
//       fatGram: fatGram ? +fatGram : undefined,
//       fiberGram: fiberGram ? +fiberGram : undefined,
//       carbsGram: carbsGram ? +carbsGram : undefined,
//       basePrice: +basePrice, // Required, convert to number
//       isAvailable: true, // Default to true on creation
//       isWeekly: isWeekly === "true" || isWeekly === "1", // Convert to boolean
//       // Step 5a: Add gallery images as related MealImage records
//       mealImages: {
//         create: galleryFiles.map((f) => ({
//           url: `/uploads/meals/${f.filename}`,
//         })),
//       },
//       // Step 5b: Add available days as related MealAvailableDay records
//       availableDays: availableDays
//         ? { create: availableDays.split(",").map((d) => ({ day: d.trim() })) }
//         : undefined,
//     };

//     // Step 6: Add dietary tags if provided (expects JSON array of strings)
//     if (dietaryTags) {
//       // Parse dietaryTags JSON string and create related records
//       const tags = JSON.parse(dietaryTags);
//       data.dietaryTags = { create: tags.map((tag) => ({ tag })) };
//     }

//     // Step 7: Add ingredients if provided (expects JSON array of strings)
//     if (ingredients) {
//       // Parse ingredients JSON string and create related records
//       const items = JSON.parse(ingredients);
//       data.ingredients = { create: items.map((name) => ({ name })) };
//     }

//     // Step 8: Add option groups and options if meal is CUSTOMIZABLE
//     // Expects optionGroups as JSON array of groups, each with options
//     if (configType === "CUSTOMIZABLE" && optionGroups) {
//       // Parse optionGroups JSON string
//       const groups = JSON.parse(optionGroups);
//       data.mealOptionGroups = {
//         create: groups.map((grp, gIdx) => ({
//           title: grp.title, // Group title
//           isRequired: grp.isRequired, // Is selection required
//           minSelect: grp.minSelect, // Minimum options to select
//           maxSelect: grp.maxSelect, // Maximum options to select

//           options: {
//             create: grp.options.map((opt, oIdx) => {
//               // Option image fieldname: option_{groupIndex}_{optionIndex}
//               const key = `option_${gIdx}_${oIdx}`;
//               const file = filesByField[key];
//               return {
//                 name: opt.name, // Option name
//                 price: +opt.price, // Option price
//                 image: file ? `/uploads/meals/${file.filename}` : null, // Option image URL
//                 isDefault: !!opt.isDefault, // Is default option
//               };
//             }),
//           },
//         })),
//       };
//     }

//     // Step 9: Create the meal and all nested relations in a single Prisma call
//     // This will create the meal, images, option groups, tags, etc. atomically
//     const meal = await prisma.meal.create({
//       data,
//       include: {
//         mealImages: true, // Include gallery images
//         mealOptionGroups: { include: { options: true } }, // Include option groups and options
//         availableDays: true, // Include available days
//         dietaryTags: true, // Include dietary tags
//         ingredients: true, // Include ingredients
//       },
//     });

//     // Step 10: Return the created meal as JSON response
//     return res.status(201).json(meal);
//   } catch (error) {
//     // Step 11: Handle errors and return a 500 response with error details
//     console.error(error);
//     return res
//       .status(500)
//       .json({ error: "Failed to create meal", details: error.message });
//   }
// };
export const addVendorMeal = async (req, res) => {
  try {
    const filesByField = indexFiles(req.files);
    const vendorId = req.user.id;

    const {
      title,
      description,
      type,
      configType,
      cuisine,
      isVeg,
      energyKcal,
      proteinGram,
      fatGram,
      fiberGram,
      carbsGram,
      basePrice,
      isWeekly,
      availableDays,
      optionGroups,
      dietaryTags,
      ingredients,
    } = req.body;

    const mainFile = filesByField["mainImage"];
    const image = mainFile ? `/uploads/meals/${mainFile.filename}` : null;

    const galleryFiles = Object.keys(filesByField)
      .filter((key) => key.startsWith("gallery_"))
      .map((key) => filesByField[key]);

    const data = {
      title,
      description,
      image,
      type, // must match MealType enum
      configType, // must match MealConfigType enum
      cuisine,
      isVeg: isVeg === "true" || isVeg === "1",
      energyKcal: energyKcal ? Number(energyKcal) : undefined,
      proteinGram: proteinGram ? Number(proteinGram) : undefined,
      fatGram: fatGram ? Number(fatGram) : undefined,
      fiberGram: fiberGram ? Number(fiberGram) : undefined,
      carbsGram: carbsGram ? Number(carbsGram) : undefined,
      basePrice: basePrice ? Number(basePrice) : 0, // ✅ prevents NaN
      isAvailable: true,
      isWeekly: isWeekly === "true" || isWeekly === "1",

      mealImages: {
        create: galleryFiles.map((f) => ({
          url: `/uploads/meals/${f.filename}`,
        })),
      },

      availableDays: availableDays
        ? {
            create: (() => {
              try {
                // If frontend sent JSON string, parse it
                const days = JSON.parse(availableDays);
                return days.map((d) => ({ day: d.trim() }));
              } catch {
                // If just comma string, fallback
                return availableDays.split(",").map((d) => ({ day: d.trim() }));
              }
            })(),
          }
        : undefined,

      vendor: { connect: { id: Number(vendorId) } }, // ✅ fixes relation issue
    };

    if (dietaryTags) {
      const tags = JSON.parse(dietaryTags);
      data.dietaryTags = { create: tags.map((tag) => ({ tag })) };
    }

    if (ingredients) {
      const items = JSON.parse(ingredients);
      data.ingredients = { create: items.map((name) => ({ name })) };
    }

    if (configType === "CUSTOMIZABLE" && optionGroups) {
      const groups = JSON.parse(optionGroups);
      data.mealOptionGroups = {
        create: groups.map((grp, gIdx) => ({
          title: grp.title,
          isRequired: !!grp.isRequired,
          minSelect: grp.minSelect ?? null,
          maxSelect: grp.maxSelect ?? null,
          options: {
            create: grp.options.map((opt, oIdx) => {
              const key = `option_${gIdx}_${oIdx}`;
              const file = filesByField[key];
              return {
                name: opt.name,
                price: Number(opt.price) || 0,
                image: file ? `/uploads/meals/${file.filename}` : null,
                isDefault: !!opt.isDefault,
              };
            }),
          },
        })),
      };
    }

    const meal = await prisma.meal.create({
      data,
      include: {
        mealImages: true,
        mealOptionGroups: { include: { options: true } },
        availableDays: true,
        dietaryTags: true,
        ingredients: true,
      },
    });

    return res.status(201).json(meal);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Failed to create meal", details: error.message });
  }
};

/**
 * Get all meals for the current vendor
 * Returns all meals created by the authenticated vendor, including all related data
 * @route GET /meals
 * @access Vendor
 */
export const getMealsByVendor = async (req, res) => {
  try {
    // Step 1: Get vendorId from authenticated user
    const vendorId = Number(req.user.id);
    if (isNaN(vendorId))
      return res.status(400).json({ error: "Invalid vendorId" });

    // Step 2: Fetch all meals for this vendor, including all related data
    const meals = await prisma.meal.findMany({
      where: { vendorId },
      include: {
        mealImages: true, // Include gallery images
        mealOptionGroups: { include: { options: true } }, // Include option groups and options
        availableDays: true, // Include available days
        dietaryTags: true, // Include dietary tags
        ingredients: true, // Include ingredients
      },
      orderBy: { createdAt: "desc" }, // Most recent first
    });

    // Step 3: Return the meals as JSON response
    return res.status(200).json(meals);
  } catch (error) {
    // Step 4: Handle errors and return a 500 response
    console.error("Failed to fetch meals:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// get meal by ID
/**
 * Get a single meal by ID for the current vendor
 * Returns the meal with all related data if it belongs to the authenticated vendor
 * @route GET /meals/:id
 * @access Vendor
 */
export const getMealByIdVendor = async (req, res) => {
  try {
    // Step 1: Parse mealId from request params
    const mealId = Number(req.params.id);
    if (isNaN(mealId)) return res.status(400).json({ error: "Invalid mealId" });

    // Step 2: Get vendorId from authenticated user
    const vendorId = Number(req.user.id);
    if (isNaN(vendorId))
      return res.status(400).json({ error: "Invalid vendorId" });

    // Step 3: Fetch the meal by ID and vendorId, including all related data
    const meal = await prisma.meal.findUnique({
      where: { id: mealId, vendorId },
      include: {
        mealImages: true, // Include gallery images
        mealOptionGroups: { include: { options: true } }, // Include option groups and options
        availableDays: true, // Include available days
        dietaryTags: true, // Include dietary tags
        ingredients: true, // Include ingredients
      },
    });

    // Step 4: If meal not found, return 404
    if (!meal) return res.status(404).json({ error: "Meal not found" });

    // Step 5: Return the meal as JSON response
    return res.status(200).json(meal);
  } catch (error) {
    // Step 6: Handle errors and return a 500 response
    console.error("Failed to fetch meal:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH /meals/:mealId

/**
 * Update an existing meal for the current vendor
 * Handles file uploads, updates details, and manages nested relations
 * @route PATCH /meals/:id
 * @access Vendor
 */
export const updateVendorMeal = async (req, res) => {
  try {
    // Step 1: Parse mealId from request params
    const mealId = Number(req.params.id);
    if (isNaN(mealId)) return res.status(400).json({ error: "Invalid mealId" });
    // Step 2: Get vendorId from authenticated user
    const vendorId = Number(req.user.id);
    if (isNaN(vendorId))
      return res.status(400).json({ error: "Invalid vendorId" });

    // Step 3: Check if the meal exists and belongs to this vendor
    const existingMeal = await prisma.meal.findUnique({
      where: { id: mealId, vendorId },
    });
    if (!existingMeal) return res.status(404).json({ error: "Meal not found" });

    // Step 4: Index uploaded files by their fieldname
    const filesByField = indexFiles(req.files);
    // Step 5: Extract all updatable fields from the request body
    const {
      title,
      description,
      type,
      configType,
      cuisine,
      isVeg,
      energyKcal,
      proteinGram,
      fatGram,
      fiberGram,
      carbsGram,
      basePrice,
      isAvailable,
      isWeekly,
      availableDays,
      optionGroups,
      dietaryTags,
      ingredients,
    } = req.body;

    // Step 6: Manual cascade delete for nested relations if new data is provided
    // This ensures old related records are removed before adding new ones
    if (availableDays)
      await prisma.mealAvailableDay.deleteMany({ where: { mealId } });
    if (dietaryTags)
      await prisma.mealDietaryTag.deleteMany({ where: { mealId } });
    if (ingredients)
      await prisma.mealIngredient.deleteMany({ where: { mealId } });
    if (optionGroups) {
      // Delete options then groups
      await prisma.mealOption.deleteMany({
        where: { optionGroup: { mealId } },
      });
      await prisma.mealOptionGroup.deleteMany({ where: { mealId } });
    }

    // Step 7: Build update data object
    const data = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (type) data.type = type;
    if (configType) data.configType = configType;
    if (cuisine) data.cuisine = cuisine;
    if (isVeg !== undefined) data.isVeg = isVeg === "true" || isVeg === "1";
    if (energyKcal) data.energyKcal = +energyKcal;
    if (proteinGram) data.proteinGram = +proteinGram;
    if (fatGram) data.fatGram = +fatGram;
    if (fiberGram) data.fiberGram = +fiberGram;
    if (carbsGram) data.carbsGram = +carbsGram;
    if (basePrice) data.basePrice = +basePrice;
    if (isAvailable !== undefined)
      data.isAvailable = isAvailable === "true" || isAvailable === "1";
    if (isWeekly !== undefined)
      data.isWeekly = isWeekly === "true" || isWeekly === "1";

    // Step 8: Handle main thumbnail image update
    const mainFile = filesByField["mainImage"];
    if (mainFile) data.image = `/uploads/meals/${mainFile.filename}`;

    // Step 9: Append new gallery images if provided
    const galleryFiles = Object.keys(filesByField)
      .filter((key) => key.startsWith("gallery_"))
      .map((key) => filesByField[key]);
    if (galleryFiles.length) {
      data.mealImages = {
        create: galleryFiles.map((f) => ({
          url: `/uploads/meals/${f.filename}`,
        })),
      };
    }

    // Step 10: Re-create available days if provided
    if (availableDays) {
      const days = availableDays.split(",").map((d) => ({ day: d.trim() }));
      data.availableDays = { create: days };
    }
    // Step 11: Re-create dietary tags if provided
    if (dietaryTags) {
      const tags = JSON.parse(dietaryTags);
      data.dietaryTags = { create: tags.map((tag) => ({ tag })) };
    }
    // Step 12: Re-create ingredients if provided
    if (ingredients) {
      const items = JSON.parse(ingredients);
      data.ingredients = { create: items.map((name) => ({ name })) };
    }
    // Step 13: Re-create option groups and options if provided
    if (configType === "CUSTOMIZABLE" && optionGroups) {
      const groups = JSON.parse(optionGroups);
      data.mealOptionGroups = {
        create: groups.map((grp, gIdx) => ({
          title: grp.title,
          isRequired: grp.isRequired,
          minSelect: grp.minSelect,
          maxSelect: grp.maxSelect,
          options: {
            create: grp.options.map((opt, oIdx) => {
              const file = filesByField[`option_${gIdx}_${oIdx}`];
              return {
                name: opt.name,
                price: +opt.price,
                image: file ? `/uploads/meals/${file.filename}` : null,
                isDefault: !!opt.isDefault,
              };
            }),
          },
        })),
      };
    }

    // Step 14: Update the meal and all nested relations in a single Prisma call
    const updated = await prisma.meal.update({
      where: { id: mealId },
      data,
      include: {
        mealImages: true, // Include gallery images
        mealOptionGroups: { include: { options: true } }, // Include option groups and options
        availableDays: true, // Include available days
        dietaryTags: true, // Include dietary tags
        ingredients: true, // Include ingredients
      },
    });

    // Step 15: Return the updated meal as JSON response
    return res.status(200).json(updated);
  } catch (error) {
    // Step 16: Handle errors and return a 500 response
    console.error("Failed to update meal:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// PUT /meals/:mealId/status
/**
 * Update the status of a meal (available/unavailable)
 */
export const updateStatusMealVendor = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch current status
    const meal = await prisma.meal.findUnique({ where: { id: Number(id) } });
    if (!meal) return res.status(404).json({ error: "Meal not found" });

    // Toggle isAvailable: if true -> false, if false -> true
    const updated = await prisma.meal.update({
      where: { id: Number(id) },
      data: { isAvailable: !meal.isAvailable },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Failed to update meal status:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// DELETE /meals/:mealId/soft-delete

export const softDeleteMealVendor = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if meal exists
    const meal = await prisma.meal.findUnique({ where: { id: Number(id) } });
    if (!meal) return res.status(404).json({ error: "Meal not found" });

    // Soft delete by setting isDeleted to true and deletedAt timestamp
    const updated = await prisma.meal.update({
      where: { id: Number(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Failed to soft delete meal:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
