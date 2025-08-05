/*
  Warnings:

  - Added the required column `vendorId` to the `MealSchedule` table without a default value. This is not possible if the table is not empty.

*/

-- First, add the columns as nullable
ALTER TABLE `mealschedule` ADD COLUMN `deliveryPartnerId` INTEGER NULL,
    ADD COLUMN `vendorId` INTEGER NULL;

-- Update existing records with vendorId from their associated orders
UPDATE `mealschedule` ms 
JOIN `order` o ON ms.orderId = o.id 
SET ms.vendorId = o.vendorId;

-- Now make vendorId NOT NULL since all existing records should have values
ALTER TABLE `mealschedule` MODIFY COLUMN `vendorId` INTEGER NOT NULL;

-- Create Settings table
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gst` DOUBLE NOT NULL,
    `vendorCommission` DOUBLE NOT NULL,
    `deliveryPartnerCommission` DOUBLE NOT NULL,
    `adminCommission` DOUBLE NOT NULL,
    `deliveryChargePerKilometer` DOUBLE NOT NULL,
    `platformCharge` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `MealSchedule_vendorId_scheduledDate_idx` ON `MealSchedule`(`vendorId`, `scheduledDate`);

-- CreateIndex
CREATE INDEX `MealSchedule_deliveryPartnerId_scheduledDate_idx` ON `MealSchedule`(`deliveryPartnerId`, `scheduledDate`);

-- AddForeignKey
ALTER TABLE `MealSchedule` ADD CONSTRAINT `MealSchedule_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MealSchedule` ADD CONSTRAINT `MealSchedule_deliveryPartnerId_fkey` FOREIGN KEY (`deliveryPartnerId`) REFERENCES `DeliveryPartner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
