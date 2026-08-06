<?php
/**
 * ค่าเริ่มต้นของอัตราค่าตอบแทน / จำนวนชั่วโมง สำหรับการปฏิบัติงานนอกเวลาราชการ
 * เก็บในตาราง settings (key-value) แก้ไขได้จากหน้า "จัดการค่าธรรมเนียม"
 */

const WORK_RATE_DEFAULTS = [
    'owr_weekday_hours'  => 1,
    'owr_weekday_rate'   => 50,
    'owr_saturday_hours' => 7,
    'owr_saturday_rate'  => 60,
    'owr_holiday_hours'  => 0,
    'owr_holiday_rate'   => 0,
];

function ensureSettingsTable(PDO $conn): void
{
    $conn->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `setting_key` varchar(50) NOT NULL,
        `setting_value` text DEFAULT NULL,
        PRIMARY KEY (`setting_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

/**
 * อ่านค่าที่ตั้งไว้ ถ้ายังไม่เคยตั้งจะคืนค่า default เดิมของระบบ
 *
 * หมายเหตุ: ห้ามสั่ง DDL (CREATE TABLE) ในนี้ เพราะฟังก์ชันนี้ถูกเรียกภายใน
 * transaction ของ auto_generate/save ซึ่ง DDL จะทำให้ MySQL implicit commit
 * แล้ว $conn->commit() จะพังด้วย "There is no active transaction"
 * ถ้าตาราง settings ยังไม่มี ให้ใช้ค่า default ไปก่อน (หน้าจัดการค่าธรรมเนียมจะสร้างให้เอง)
 */
function getWorkRateConfig(PDO $conn): array
{
    $config = WORK_RATE_DEFAULTS;

    $keys = array_keys(WORK_RATE_DEFAULTS);
    $placeholders = str_repeat('?,', count($keys) - 1) . '?';

    try {
        $stmt = $conn->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ($placeholders)");
        $stmt->execute($keys);
    } catch (PDOException $e) {
        return $config; // ยังไม่มีตาราง settings
    }

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if ($row['setting_value'] !== null && $row['setting_value'] !== '') {
            $config[$row['setting_key']] = (float)$row['setting_value'];
        }
    }

    return $config;
}

/**
 * คำนวณ ชม./อัตรา ของวันที่ระบุ ตามประเภทวัน
 *
 * @param array $config      ผลจาก getWorkRateConfig()
 * @param string $date       รูปแบบ Y-m-d
 * @param array $holidays    รายการวันหยุดพิเศษ (Y-m-d)
 * @return array [hours, rate, isHolidayFlag]
 */
function resolveWorkRate(array $config, string $date, array $holidays): array
{
    $dayOfWeek = (int)date('N', strtotime($date)); // 1 (จ.) - 7 (อา.)
    $isSpecialHoliday = in_array($date, $holidays, true);

    if ($dayOfWeek === 7 || $isSpecialHoliday) {
        // วันอาทิตย์ / วันหยุดนักขัตฤกษ์
        return [$config['owr_holiday_hours'], $config['owr_holiday_rate'], 1];
    }

    if ($dayOfWeek === 6) {
        // วันเสาร์
        return [$config['owr_saturday_hours'], $config['owr_saturday_rate'], 1];
    }

    // วันธรรมดา (จันทร์ - ศุกร์)
    return [$config['owr_weekday_hours'], $config['owr_weekday_rate'], 0];
}
