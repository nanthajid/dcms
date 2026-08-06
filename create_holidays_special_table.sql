-- ตารางวันหยุดสำหรับ "ทำงานนอกเวลาราชการ (กรณีพิเศษ)"
-- แยกอิสระจากตาราง holidays ของหน้า outside-work ปกติ
CREATE TABLE IF NOT EXISTS `holidays_special` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `holiday_date` date NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `holiday_date` (`holiday_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
