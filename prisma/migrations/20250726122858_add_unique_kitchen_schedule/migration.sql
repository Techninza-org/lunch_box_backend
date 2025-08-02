/*
  Warnings:

  - A unique constraint covering the columns `[kitchenId,dayOfWeek]` on the table `KitchenSchedule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `KitchenSchedule_kitchenId_dayOfWeek_key` ON `KitchenSchedule`(`kitchenId`, `dayOfWeek`);
