-- AlterTable
ALTER TABLE `meal` ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `Order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `orderType` ENUM('ONETIME', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'ONETIME',
    `status` ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `subtotal` DOUBLE NOT NULL,
    `deliveryCharges` DOUBLE NOT NULL DEFAULT 0,
    `taxes` DOUBLE NOT NULL DEFAULT 0,
    `discount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL,
    `paymentType` ENUM('CASH_ON_DELIVERY', 'RAZORPAY', 'UPI', 'CARD', 'WALLET') NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `deliveryAddress` VARCHAR(191) NOT NULL,
    `deliveryCity` VARCHAR(191) NOT NULL,
    `deliveryState` VARCHAR(191) NOT NULL,
    `deliveryZipCode` VARCHAR(191) NOT NULL,
    `deliveryPhone` VARCHAR(191) NULL,
    `deliveryLat` DOUBLE NULL,
    `deliveryLng` DOUBLE NULL,
    `subscriptionStartDate` DATETIME(3) NULL,
    `subscriptionEndDate` DATETIME(3) NULL,
    `totalMealsInSubscription` INTEGER NULL,
    `deliveryPartnerId` INTEGER NULL,
    `orderNotes` VARCHAR(191) NULL,
    `cancelReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `mealId` INTEGER NULL,
    `mealTitle` VARCHAR(191) NOT NULL,
    `mealDescription` VARCHAR(191) NULL,
    `mealImage` VARCHAR(191) NULL,
    `mealType` VARCHAR(191) NOT NULL,
    `mealCuisine` VARCHAR(191) NOT NULL,
    `isVeg` BOOLEAN NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItemOption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderItemId` INTEGER NOT NULL,
    `optionId` INTEGER NULL,
    `optionName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MealSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `orderItemId` INTEGER NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `scheduledTimeSlot` VARCHAR(191) NOT NULL,
    `mealType` VARCHAR(191) NOT NULL,
    `mealTitle` VARCHAR(191) NOT NULL,
    `mealImage` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('SCHEDULED', 'PREPARED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'MISSED') NOT NULL DEFAULT 'SCHEDULED',
    `actualDeliveryTime` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MealSchedule_scheduledDate_status_idx`(`scheduledDate`, `status`),
    INDEX `MealSchedule_orderId_scheduledDate_idx`(`orderId`, `scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_deliveryPartnerId_fkey` FOREIGN KEY (`deliveryPartnerId`) REFERENCES `DeliveryPartner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_mealId_fkey` FOREIGN KEY (`mealId`) REFERENCES `Meal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItemOption` ADD CONSTRAINT `OrderItemOption_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MealSchedule` ADD CONSTRAINT `MealSchedule_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
