/*
  Warnings:

  - You are about to drop the `ambientedemo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lusuarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `post` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `post` DROP FOREIGN KEY `Post_usuarioId_fkey`;

-- DropTable
DROP TABLE `ambientedemo`;

-- DropTable
DROP TABLE `lusuarios`;

-- DropTable
DROP TABLE `post`;
