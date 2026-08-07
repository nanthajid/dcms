<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();
require_once __DIR__ . '/work_rate_config.php';

$action = $_GET['action'] ?? '';

try {
    // Ensure outside_work_special_leaves table exists
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS `outside_work_special_leaves` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `StID` varchar(50) NOT NULL,
            `work_date` date NOT NULL,
            `original_hours` int(11) DEFAULT 0,
            `original_rate` int(11) DEFAULT 0,
            `original_amount` decimal(10,2) DEFAULT 0,
            `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `StID` (`StID`),
            KEY `work_date` (`work_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        // Table might already exist, ignore error
    }

    // Ensure outside_work_special_records table exists (ตารางหลัก ใช้โดยทุก action)
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS `outside_work_special_records` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `StID` varchar(20) NOT NULL,
            `work_date` date NOT NULL,
            `hours` decimal(5,2) DEFAULT 0,
            `rate` decimal(8,2) DEFAULT 0,
            `amount` decimal(10,2) DEFAULT 0,
            `reason` text DEFAULT NULL,
            `is_holiday` tinyint(1) DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `unique_staff_date` (`StID`,`work_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        // Table might already exist, ignore error
    }

    // Ensure holidays_special table exists (ใช้โดย save/auto_generate)
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS `holidays_special` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `holiday_date` date NOT NULL,
            `name` varchar(255) NOT NULL,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `holiday_date` (`holiday_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        // Table might already exist, ignore error
    }

    if ($action === 'list') {
        $query = "SELECT o.*, s.StName, s.sort_order, p.StPostName, d.DepName, s.DepNo, t.Title, pt.PostType, pt.PostTypeName
                  FROM outside_work_special_records o
                  LEFT JOIN staffs s ON TRIM(o.StID) = TRIM(s.StID)
                  LEFT JOIN positions p ON s.StPost = p.StPost
                  LEFT JOIN post_type pt ON p.PostType = pt.PostType
                  LEFT JOIN departments d ON s.DepNo = d.DepNo
                  LEFT JOIN titles t ON s.TitleNo = t.TitleNo
                  ORDER BY CAST(s.sort_order AS UNSIGNED) ASC, o.work_date ASC, o.StID ASC";
        $stmt = $conn->query($query);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->StID) && !empty($data->dates)) {
            try {
                $conn->beginTransaction();

                $holidayStmt = $conn->query("SELECT holiday_date FROM holidays_special");
                $holidays = $holidayStmt->fetchAll(PDO::FETCH_COLUMN);

                foreach ($data->dates as $date) {
                    $timestamp = strtotime($date);
                    $dayOfWeek = date('N', $timestamp);

                    $isHoliday = in_array($date, $holidays);
                    $isSunday = ($dayOfWeek == 7);

                    // กรณีพิเศษ: บันทึกวันเวลา hours = 0 เสมอ
                    $hours = 0;
                    $rate = 0;
                    $amount = 0;
                    if ($isSunday || $isHoliday) {
                        $isHolidayFlag = 1;
                    } elseif ($dayOfWeek == 6) {
                        $isHolidayFlag = 1;
                    } else {
                        $isHolidayFlag = 0;
                    }

                    $checkStmt = $conn->prepare("SELECT id FROM outside_work_special_records WHERE StID = ? AND work_date = ?");
                    $checkStmt->execute([$data->StID, $date]);
                    if ($checkStmt->fetch()) {
                        continue;
                    }

                    $stmt = $conn->prepare("INSERT INTO outside_work_special_records (StID, work_date, hours, rate, amount, reason, is_holiday) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([
                        $data->StID,
                        $date,
                        $hours,
                        $rate,
                        $amount,
                        $data->reason ?? '',
                        $isHolidayFlag
                    ]);
                }

                $conn->commit();
                echo json_encode(["success" => true, "message" => "บันทึกข้อมูลการทำงานนอกเวลา (กรณีพิเศษ) สำเร็จ"]);
            } catch (Exception $e) {
                if ($conn->inTransaction()) $conn->rollBack();
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        }
    }
    elseif ($action === 'update') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            $checkStmt = $conn->prepare("SELECT hours, rate, amount FROM outside_work_special_records WHERE id = ?");
            $checkStmt->execute([$data->id]);
            $current = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$current) {
                echo json_encode(["success" => false, "message" => "ไม่พบรายการที่ต้องการแก้ไข"]);
            } else {
                $hours = isset($data->hours) ? (float)$data->hours : (float)$current['hours'];
                $rate = isset($data->rate) ? (float)$data->rate : (float)$current['rate'];
                $amount = isset($data->amount) ? (float)$data->amount : $hours * $rate;

                if ($hours < 0 || $rate < 0 || $amount < 0) {
                    echo json_encode(["success" => false, "message" => "ค่าที่กรอกต้องไม่ติดลบ"]);
                } else {
                    $stmt = $conn->prepare("UPDATE outside_work_special_records SET hours = ?, rate = ?, amount = ? WHERE id = ?");
                    $stmt->execute([$hours, $rate, $amount, $data->id]);
                    echo json_encode(["success" => true, "message" => "แก้ไขข้อมูลสำเร็จ"]);
                }
            }
        } else {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        }
    }
    elseif ($action === 'delete') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            $stmt = $conn->prepare("DELETE FROM outside_work_special_records WHERE id = ?");
            $stmt->execute([$data->id]);
            echo json_encode(["success" => true, "message" => "ลบข้อมูลสำเร็จ"]);
        }
    }
    elseif ($action === 'bulk_delete') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->ids) && is_array($data->ids)) {
            $placeholders = str_repeat('?,', count($data->ids) - 1) . '?';
            $stmt = $conn->prepare("DELETE FROM outside_work_special_records WHERE id IN ($placeholders)");
            $stmt->execute($data->ids);
            echo json_encode(["success" => true, "message" => "ลบข้อมูลที่เลือกสำเร็จ " . count($data->ids) . " รายการ"]);
        } else {
            echo json_encode(["success" => false, "message" => "กรุณาเลือกรายการที่ต้องการลบ"]);
        }
    }
    elseif ($action === 'clear') {
        $data = json_decode(file_get_contents("php://input"));
        $month = $data->month ?? null;
        $year = $data->year ?? null;

        if ($month && $year) {
            $stmt = $conn->prepare("DELETE FROM outside_work_special_records WHERE MONTH(work_date) = ? AND YEAR(work_date) = ?");
            $stmt->execute([$month, $year]);
            echo json_encode(["success" => true, "message" => "ล้างข้อมูลการทำงานนอกเวลา (กรณีพิเศษ) ประจำเดือนสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        }
    }
    elseif ($action === 'auto_generate') {
        $data = json_decode(file_get_contents("php://input"));
        $month = $data->month ?? null;
        $year = $data->year ?? null;
        $postTypes = $data->PostTypes ?? [];
        $departments = $data->Departments ?? [];

        if (!$month || !$year) {
            throw new Exception("กรุณาระบุเดือนและปี");
        }

        $conn->beginTransaction();

        $staffQuery = "SELECT s.StID FROM staffs s JOIN positions p ON s.StPost = p.StPost WHERE 1=1";
        $params = [];

        if (!empty($postTypes) && is_array($postTypes)) {
            $placeholders = str_repeat('?,', count($postTypes) - 1) . '?';
            $staffQuery .= " AND p.PostType IN ($placeholders)";
            $params = array_merge($params, $postTypes);
        }

        if (!empty($departments) && is_array($departments)) {
            $placeholders = str_repeat('?,', count($departments) - 1) . '?';
            $staffQuery .= " AND s.DepNo IN ($placeholders)";
            $params = array_merge($params, $departments);
        }

        $staffStmt = $conn->prepare($staffQuery);
        $staffStmt->execute($params);
        $staffs = $staffStmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($staffs)) {
            throw new Exception("ไม่พบเจ้าหน้าที่ในกลุ่มตำแหน่งที่เลือก");
        }

        $holidayStmt = $conn->prepare("SELECT holiday_date FROM holidays_special WHERE MONTH(holiday_date) = ? AND YEAR(holiday_date) = ?");
        $holidayStmt->execute([$month, $year]);
        $holidays = $holidayStmt->fetchAll(PDO::FETCH_COLUMN);

        // วันลา (กรณีพิเศษ) อ้างอิงจากตาราง special เท่านั้น แยกอิสระจากระบบลากลาง (staff_leaves)
        $leaveStmt = $conn->prepare("SELECT StID, work_date FROM outside_work_special_leaves
                                     WHERE MONTH(work_date) = ? AND YEAR(work_date) = ?");
        $leaveStmt->execute([$month, $year]);
        $leaves = $leaveStmt->fetchAll(PDO::FETCH_ASSOC);

        $leaveMap = [];
        foreach ($leaves as $leave) {
            $sid = trim($leave['StID']);
            $leaveMap[$sid][$leave['work_date']] = true;
        }

        $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);

        $insertStmt = $conn->prepare("INSERT IGNORE INTO outside_work_special_records (StID, work_date, hours, rate, amount, reason, is_holiday) VALUES (?, ?, ?, ?, ?, ?, ?)");

        $rateConfig = getWorkRateConfig($conn);

        // ค่าธรรมเนียมที่ส่งมาจากโมดัลยืนยัน: ใช้เฉพาะรอบนี้ ไม่เขียนทับค่าในตาราง settings
        if (!empty($data->rates)) {
            foreach (array_keys(WORK_RATE_DEFAULTS) as $key) {
                if (!isset($data->rates->$key)) continue;

                $value = $data->rates->$key;
                if (!is_numeric($value) || (float)$value < 0) {
                    throw new Exception("ค่าธรรมเนียม/ชั่วโมงไม่ถูกต้อง ($key)");
                }
                $rateConfig[$key] = (float)$value;
            }
        }

        // ช่วงวันที่ที่เลือกจากโมดัล (ไม่ส่งมา = ทั้งเดือน)
        $startDay = isset($data->start_day) ? (int)$data->start_day : 1;
        $endDay = isset($data->end_day) ? (int)$data->end_day : $daysInMonth;
        $startDay = max(1, min($startDay, $daysInMonth));
        $endDay = max(1, min($endDay, $daysInMonth));

        if ($startDay > $endDay) {
            throw new Exception("ช่วงวันที่ไม่ถูกต้อง: วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด");
        }

        $count = 0;
        for ($day = $startDay; $day <= $endDay; $day++) {
            $date = sprintf("%04d-%02d-%02d", $year, $month, $day);

            list($hours, $rate, $isHolidayFlag) = resolveWorkRate($rateConfig, $date, $holidays);
            $amount = $hours * $rate;

            foreach ($staffs as $stID) {
                if (isset($leaveMap[trim($stID)][$date])) {
                    continue;
                }

                $insertStmt->execute([
                    $stID,
                    $date,
                    $hours,
                    $rate,
                    $amount,
                    'ลงเวลาอัตโนมัติ (กรณีพิเศษ)',
                    $isHolidayFlag
                ]);
                if ($insertStmt->rowCount() > 0) $count++;
            }
        }

        $conn->commit();
        echo json_encode(["success" => true, "message" => "สร้างข้อมูลอัตโนมัติ (กรณีพิเศษ) สำเร็จ จำนวน $count รายการ"]);
    }
    elseif ($action === 'restore_hours') {
        $data = json_decode(file_get_contents("php://input"));
        if (empty($data->id)) {
            echo json_encode(["success" => false, "message" => "ไม่พบรหัสรายการ"]);
        } else {
            $stmt = $conn->prepare("UPDATE outside_work_special_records SET hours = ?, rate = ?, amount = ? WHERE id = ?");
            $stmt->execute([$data->hours, $data->rate, $data->amount, $data->id]);
            echo json_encode(["success" => true, "message" => "คืนค่าชั่วโมงสำเร็จ"]);
        }
    }
    elseif ($action === 'delete_leave') {
        $data = json_decode(file_get_contents("php://input"));
        if (empty($data->id)) {
            echo json_encode(["success" => false, "message" => "ไม่พบรหัสรายการ"]);
            exit;
        }

        $conn->beginTransaction();
        try {
            // Get StID and work_date from outside_work_special_records
            $getRecordStmt = $conn->prepare("SELECT StID, work_date FROM outside_work_special_records WHERE id = ?");
            $getRecordStmt->execute([$data->id]);
            $record = $getRecordStmt->fetch(PDO::FETCH_ASSOC);

            if (!$record) {
                echo json_encode(["success" => false, "message" => "ไม่พบข้อมูลการทำงานนอกเวลา"]);
                exit;
            }

            $stId = trim($record['StID']);
            $workDate = $record['work_date'];

            // Get original hours from leave record using StID and work_date
            $getOriginalStmt = $conn->prepare("SELECT original_hours, original_rate, original_amount FROM outside_work_special_leaves WHERE TRIM(StID) = TRIM(?) AND work_date = ? ORDER BY id DESC LIMIT 1");
            $getOriginalStmt->execute([$stId, $workDate]);
            $original = $getOriginalStmt->fetch(PDO::FETCH_ASSOC);

            if ($original && $original['original_hours'] > 0) {
                // Restore original hours
                $updateStmt = $conn->prepare("UPDATE outside_work_special_records SET hours = ?, rate = ?, amount = ? WHERE id = ?");
                $updateStmt->execute([
                    $original['original_hours'],
                    $original['original_rate'],
                    $original['original_amount'],
                    $data->id
                ]);
            } else {
                // If no original hours, delete the record
                $deleteStmt = $conn->prepare("DELETE FROM outside_work_special_records WHERE id = ?");
                $deleteStmt->execute([$data->id]);
            }

            // Delete the leave record
            $deleteLeaveStmt = $conn->prepare("DELETE FROM outside_work_special_leaves WHERE TRIM(StID) = TRIM(?) AND work_date = ?");
            $deleteLeaveStmt->execute([$stId, $workDate]);

            $conn->commit();
            echo json_encode(["success" => true, "message" => "ลบวันลาและคืนชั่วโมงการทำงานเรียบร้อยแล้ว"]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }
    elseif ($action === 'record_leave') {
        $data = json_decode(file_get_contents("php://input"));

        $stIds = $data->StIDs ?? ($data->StID ? [$data->StID] : []);

        if (empty($stIds) || empty($data->dates)) {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        } else {
            $conn->beginTransaction();
            try {
                $getStmt = $conn->prepare("SELECT hours, rate, amount FROM outside_work_special_records WHERE TRIM(StID) = TRIM(?) AND work_date = ?");
                $updateStmt = $conn->prepare("UPDATE outside_work_special_records SET hours = 0, amount = 0 WHERE TRIM(StID) = TRIM(?) AND work_date = ?");
                $insertRecordStmt = $conn->prepare("INSERT INTO outside_work_special_records (StID, work_date, hours, rate, amount, reason, is_holiday) VALUES (?, ?, 0, 0, 0, ?, ?)");
                $insertLeaveStmt = $conn->prepare("INSERT INTO outside_work_special_leaves (StID, work_date, original_hours, original_rate, original_amount) VALUES (?, ?, ?, ?, ?)");

                $count = 0;
                foreach ($stIds as $rawStId) {
                    $stId = trim($rawStId);
                    foreach ($data->dates as $date) {
                        // Get original hours before updating
                        $getStmt->execute([$stId, $date]);
                        $record = $getStmt->fetch(PDO::FETCH_ASSOC);

                        if ($record) {
                            // มี record อยู่แล้ว: เก็บชั่วโมงเดิมไว้เพื่อคืนค่าภายหลัง แล้ว set เป็น 0
                            $insertLeaveStmt->execute([
                                $stId,
                                $date,
                                $record['hours'],
                                $record['rate'],
                                $record['amount']
                            ]);
                            $updateStmt->execute([$stId, $date]);
                        } else {
                            // ยังไม่มี record (เช่นยังไม่ได้สร้างข้อมูลอัตโนมัติของเดือนนั้น)
                            // สร้าง record วันลาใหม่ hours = 0 เพื่อให้บันทึกวันลาได้เสมอ
                            $timestamp = strtotime($date);
                            $dayOfWeek = date('N', $timestamp);
                            $isHolidayFlag = ($dayOfWeek == 6 || $dayOfWeek == 7) ? 1 : 0;
                            $insertRecordStmt->execute([$stId, $date, 'ลา (กรณีพิเศษ)', $isHolidayFlag]);
                            // เก็บ leave record (original = 0) เพื่อให้ลบวันลาแล้วลบ record ออกได้ถูกต้อง
                            $insertLeaveStmt->execute([$stId, $date, 0, 0, 0]);
                        }

                        $count++;
                    }
                }

                $conn->commit();
                echo json_encode(["success" => true, "message" => "บันทึกวันลาสำเร็จ จำนวน $count รายการ"]);
            } catch (Exception $e) {
                if ($conn->inTransaction()) $conn->rollBack();
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
        }
    }
} catch (Exception $e) {
    // Exception ธรรมดา (เช่น validate ไม่ผ่าน) ต้องถูกจับด้วย ไม่งั้นหลุดเป็น fatal error
    // และต้อง rollBack เพราะ auto_generate โยน exception ได้ระหว่างเปิด transaction อยู่
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
