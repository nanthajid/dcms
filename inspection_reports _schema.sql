-- ============================================================
--  ฐานข้อมูล: ระบบบันทึกผลการตรวจสอบการทำงานของคนต่างด้าว
--  ใช้ utf8mb4 เพื่อรองรับภาษาไทย (และอิโมจิ) 100%
--  รันด้วย: mysql -u root -p doearcom_cms < database/schema.sql
--  หรือผ่าน phpMyAdmin / HeidiSQL
--  หมายเหตุ: db.php เชื่อมต่อฐานข้อมูล `doearcom_cms`
-- ============================================================

CREATE TABLE IF NOT EXISTS `inspection_reports` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_code`      VARCHAR(30)  NULL COMMENT 'เลขอ้างอิง เช่น FW-20260703-00001',

  -- ── ข้อมูลการตรวจ ────────────────────────────────────────
  `report_date`      DATE         NOT NULL              COMMENT 'วันที่ตรวจ',

  -- ── 1. ตรวจสอบสถานประกอบการ (แห่ง/คน) ────────────────────
  `establishment_places`  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'สถานประกอบการที่ตรวจ (แห่ง)',
  `establishment_persons` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'แรงงานที่ตรวจ (คน)',

  -- ── 2. ตรวจสอบสถานประกอบการแย่งอาชีพ (แห่ง/คน) ────────────
  `occupation_places`     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'สถานประกอบการแย่งอาชีพ (แห่ง)',
  `occupation_persons`    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'แรงงานแย่งอาชีพ (คน)',

  -- ── 3. จับกุม/ดำเนินคดี (คน/คน) ───────────────────────────
  `arrested_persons`      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'จับกุม (คน)',
  `prosecuted_persons`    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'ดำเนินคดี (คน)',

  -- ── 4. อื่นๆ (แห่ง) ──────────────────────────────────────
  `other_places`          INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'อื่นๆ (แห่ง)',
  `other_detail`          VARCHAR(255) NULL              COMMENT 'รายละเอียดอื่นๆ',

  `note`             TEXT NULL                          COMMENT 'หมายเหตุ',
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_report_code` (`report_code`),
  KEY `idx_report_date` (`report_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
