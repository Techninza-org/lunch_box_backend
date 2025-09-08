import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkMeals() {
    try {
        // Get all meals
        const allMeals = await prisma.meal.findMany({
            include: {
                vendor: true,
            },
        });

        console.log(`Total meals in database: ${allMeals.length}`);

        // Group by type
        const mealsByType = {};
        allMeals.forEach(meal => {
            if (!mealsByType[meal.type]) {
                mealsByType[meal.type] = [];
            }
            mealsByType[meal.type].push(meal);
        });

        console.log("Meals by type:");
        Object.keys(mealsByType).forEach(type => {
            console.log(`  ${type}: ${mealsByType[type].length}`);
        });

        // Check available meals
        const availableMeals = await prisma.meal.findMany({
            where: {
                isAvailable: true,
                isDeleted: false,
            },
        });

        console.log(`Available meals: ${availableMeals.length}`);

        // Check verified meals
        const verifiedMeals = await prisma.meal.findMany({
            where: {
                isVerified: true,
            },
        });

        console.log(`Verified meals: ${verifiedMeals.length}`);

        // Check meals from approved vendors
        const mealsFromApprovedVendors = await prisma.meal.findMany({
            where: {
                vendor: {
                    status: "APPROVED",
                },
            },
        });

        console.log(`Meals from approved vendors: ${mealsFromApprovedVendors.length}`);

    } catch (error) {
        console.error("Error checking meals:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMeals();
