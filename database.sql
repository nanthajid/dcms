-- Database for AR2Home Project
-- Created for: MySQL 7.4+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Database structure for ar2home_db
-- ----------------------------
CREATE DATABASE IF NOT EXISTS `doearcom_cms` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `doearcom_cms`;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `user_type` enum('student','admin','staff') DEFAULT 'student',
  `StID` varchar(15) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `StID` (`StID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for counselors
-- ----------------------------
DROP TABLE IF EXISTS `counselors`;
CREATE TABLE `counselors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fullname` varchar(100) NOT NULL,
  `specialty` varchar(100) NOT NULL,
  `bio` text DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of counselors (Initial Data)
-- ----------------------------
INSERT INTO `counselors` (`fullname`, `specialty`, `bio`, `image_url`) VALUES 
('ดร. สมชาย ใจดี', 'แนะแนวการศึกษาต่อต่างประเทศ', 'ประสบการณ์แนะแนวมากกว่า 10 ปี เชี่ยวชาญด้านทุนการศึกษาและมหาวิทยาลัยชั้นนำ', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai'),
('อ. พรทิพย์ รักเรียน', 'จิตวิทยาการแนะแนววัยรุ่น', 'ช่วยค้นหาตัวตนและศักยภาพที่ซ่อนอยู่ เพื่อการเลือกสายอาชีพที่มั่นคง', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Porntip'),
('นายวิชาญ เก่งงาน', 'ตลาดแรงงานและอาชีพแห่งอนาคต', 'ผู้เชี่ยวชาญด้านวิเคราะห์แนวโน้มอาชีพและทักษะที่ตลาดต้องการในยุคดิจิทัล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wichan');

-- ----------------------------
-- Table structure for appointments
-- ----------------------------
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `counselor_id` int(11) NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `counselor_id` (`counselor_id`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`counselor_id`) REFERENCES `counselors` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for guidance_results
-- ----------------------------
DROP TABLE IF EXISTS `guidance_results`;
CREATE TABLE `guidance_results` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` int(11) NOT NULL,
  `summary` text NOT NULL,
  `recommendations` text DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `guidance_results_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`username`, `password`, `fullname`, `user_type`) VALUES 
('admin', 'admin1234', 'ผู้ดูแลระบบสูงสุด', 'admin');

-- ----------------------------
-- Table structure for wfh_records
-- ----------------------------
DROP TABLE IF EXISTS `wfh_records`;
CREATE TABLE `wfh_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `StID` varchar(15) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'approved',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `StID` (`StID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

DROP TABLE IF EXISTS `staffs`;
CREATE TABLE `staffs` (
  `StID` varchar(15) NOT NULL,
  `StName` varchar(100) DEFAULT NULL,
  `SexNo` varchar(10) DEFAULT NULL,
  `TitleNo` varchar(10) DEFAULT NULL,
  `StPost` varchar(255) DEFAULT '',
  `DepNo` varchar(50) DEFAULT NULL,
  `image` text DEFAULT NULL,
  PRIMARY KEY (`StID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `departments` (
  `DepNo` varchar(50) NOT NULL,
  `DepName` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`DepNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `positions` (
  `StPost` varchar(255) NOT NULL,
  `StPostName` varchar(150) DEFAULT NULL,
  `PostType` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`StPost`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `titles` (
  `TitleNo` int(11) NOT NULL AUTO_INCREMENT,
  `Title` varchar(15) DEFAULT '',
  PRIMARY KEY (`TitleNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sex` (
  `SexNo` int(1) NOT NULL,
  `SexName` varchar(5) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `post_type` (
  `PostType` char(255) NOT NULL,
  `PostTypeName` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`PostType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;