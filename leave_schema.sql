-- Database Schema for Staff Leave Management System
-- Use this script to create the necessary tables in your MySQL database.

-- 1. Table for leave categories (Types of leave)
CREATE TABLE IF NOT EXISTS `leave_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'ชื่อประเภทการลา เช่น ลาป่วย, ลากิจ',
  `color` varchar(20) DEFAULT '#3b82f6' COMMENT 'สีสำหรับแสดงผลในปฏิทิน (Hex code)',
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial standard leave types for Thai government/organization context
INSERT INTO `leave_types` (`name`, `color`, `description`) VALUES 
('ลาป่วย', '#ef4444', 'การลาเมื่อเจ็บป่วย'),
('ลากิจ', '#f59e0b', 'การลาเพื่อไปทำธุระส่วนตัว'),
('ลาพักผ่อน', '#10b981', 'การลาหยุดประจำปี'),
('ลาคลอด', '#ec4899', 'การลาเพื่อคลอดบุตร'),
('ลาอุปสมบท', '#f97316', 'การลาเพื่อเข้าพิธีอุปสมบท');

-- 2. Table for staff leave records (The actual leave entries)
CREATE TABLE IF NOT EXISTS `staff_leaves` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `StID` varchar(50) NOT NULL COMMENT 'รหัสเจ้าหน้าที่ (เชื่อมโยงกับตาราง staffs)',
  `leave_type_id` int(11) NOT NULL COMMENT 'รหัสประเภทการลา (เชื่อมโยงกับตาราง leave_types)',
  `start_date` date NOT NULL COMMENT 'วันที่เริ่มลา',
  `end_date` date NOT NULL COMMENT 'วันสุดท้ายที่ลา',
  `reason` text DEFAULT NULL COMMENT 'เหตุผลการลา',
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'approved' COMMENT 'สถานะการลา',
  `created_by` int(11) DEFAULT NULL COMMENT 'รหัสผู้บันทึกข้อมูล',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `StID` (`StID`),
  KEY `leave_type_id` (`leave_type_id`),
  -- Relationship: If a staff is deleted, their leave records are also removed (Cascade)
  CONSTRAINT `staff_leaves_ibfk_1` FOREIGN KEY (`StID`) REFERENCES `staffs` (`StID`) ON DELETE CASCADE,
  -- Relationship: Protect leave types from being deleted if there are records using them
  CONSTRAINT `staff_leaves_ibfk_2` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note on Relationships:
-- 'staffs' (PK: StID) <--- (FK: StID) 'staff_leaves'
-- 'leave_types' (PK: id) <--- (FK: leave_type_id) 'staff_leaves'
