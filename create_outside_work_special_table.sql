CREATE TABLE IF NOT EXISTS `outside_work_special_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `StID` varchar(20) NOT NULL,
  `work_date` date NOT NULL,
  `hours` decimal(5,2) DEFAULT 0,
  `rate` decimal(8,2) DEFAULT 0,
  `amount` decimal(10,2) DEFAULT 0,
  `reason` text DEFAULT NULL,
  `is_holiday` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_staff_date` (`StID`,`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
