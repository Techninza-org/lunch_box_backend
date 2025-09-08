import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testMeals() {
    try {
        console.log("Testing meal queries...");

        // Get all meals without any filters
        const allMeals = await prisma.meal.findMany();
        console.log(`Total meals in database: ${allMeals.length}`);

        // Get meals grouped by type
        const mealsByType = await prisma.meal.groupBy({
            by: ['type'],
            _count: true,
        });
        console.log("Meals by type:", mealsByType);

        // Try to get lunch meals specifically
        const lunchMeals = await prisma.meal.findMany({
            where: {
                type: "Lunch",
            },
        });
        console.log(`Lunch meals: ${lunchMeals.length}`);

        // Try to get dinner meals specifically
        const dinnerMeals = await prisma.meal.findMany({
            where: {
                type: "Dinner",
            },
        });
        console.log(`Dinner meals: ${dinnerMeals.length}`);

        // Try to get breakfast meals specifically
        const breakfastMeals = await prisma.meal.findMany({
            where: {
                type: "Breakfast",
            },
        });
        console.log(`Breakfast meals: ${breakfastMeals.length}`);

        // Try to get evening meals specifically
        const eveningMeals = await prisma.meal.findMany({
            where: {
                type: "Evening",
            },
        });
        console.log(`Evening meals: ${eveningMeals.length}`);

        if (allMeals.length > 0) {
            console.log("Sample meal:", JSON.stringify(allMeals[0], null, 2));
        }

    } catch (error) {
        console.error("Error testing meals:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testMeals();