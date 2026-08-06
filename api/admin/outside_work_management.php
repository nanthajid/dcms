<?php
require_once '../config.php';
require_once __DIR__ . '/work_rate_config.php';

$action = $_GET['action'] ?? '';

try {
    if ($action === 'list') {
        $query = "SELECT o.*, s.StName, s.sort_order, p.StPostName, d.DepName, s.DepNo, t.Title, pt.PostType, pt.PostTypeName
                  FROM outside_work_records o
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

                // Get all holiday dates for reference
                $holidayStmt = $conn->query("SELECT holiday_date FROM holidays");
                $holidays = $holidayStmt->fetchAll(PDO::FETCH_COLUMN);

                $rateConfig = getWorkRateConfig($conn);

                foreach ($data->dates as $date) {
                    list($hours, $rate, $isHolidayFlag) = resolveWorkRate($rateConfig, $date, $holidays);
                    $amount = $hours * $rate;

                    // Check if record already exists for this staff and date
                    $checkStmt = $conn->prepare("SELECT id FROM outside_work_records WHERE StID = ? AND work_date = ?");
                    $checkStmt->execute([$data->StID, $date]);
                    if ($checkStmt->fetch()) {
                        // Skip or update? Let's skip or throw error
                        continue; 
                    }

                    $stmt = $conn->prepare("INSERT INTO outside_work_records (StID, work_date, hours, rate, amount, reason, is_holiday) VALUES (?, ?, ?, ?, ?, ?, ?)");
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
                echo json_encode(["success" => true, "message" => "บันทึกข้อมูลการทำงานนอกสำเร็จ"]);
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
            $checkStmt = $conn->prepare("SELECT hours, rate, amount FROM outside_work_records WHERE id = ?");
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
                    $stmt = $conn->prepare("UPDATE outside_work_records SET hours = ?, rate = ?, amount = ? WHERE id = ?");
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
            $stmt = $conn->prepare("DELETE FROM outside_work_records WHERE id = ?");
            $stmt->execute([$data->id]);
            echo json_encode(["success" => true, "message" => "ลบข้อมูลสำเร็จ"]);
        }
    }
    elseif ($action === 'bulk_delete') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->ids) && is_array($data->ids)) {
            $placeholders = str_repeat('?,', count($data->ids) - 1) . '?';
            $stmt = $conn->prepare("DELETE FROM outside_work_records WHERE id IN ($placeholders)");
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
            $stmt = $conn->prepare("DELETE FROM outside_work_records WHERE MONTH(work_date) = ? AND YEAR(work_date) = ?");
            $stmt->execute([$month, $year]);
            echo json_encode(["success" => true, "message" => "ล้างข้อมูลการทำงานนอกประจำเดือนสำเร็จ"]);
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

        // 1. Get staff, filtered by PostTypes and Departments
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

        // 2. Get holidays
        $holidayStmt = $conn->prepare("SELECT holiday_date FROM holidays WHERE MONTH(holiday_date) = ? AND YEAR(holiday_date) = ?");
        $holidayStmt->execute([$month, $year]);
        $holidays = $holidayStmt->fetchAll(PDO::FETCH_COLUMN);

        // 3. Get staff leaves for this month to exclude them
        $leaveStmt = $conn->prepare("SELECT StID, start_date, end_date FROM staff_leaves 
                                     WHERE (MONTH(start_date) = ? AND YEAR(start_date) = ?) 
                                     OR (MONTH(end_date) = ? AND YEAR(end_date) = ?)
                                     OR (start_date <= ? AND end_date >= ?)");
        
        $firstDay = sprintf("%04d-%02d-01", $year, $month);
        $lastDay = date("Y-m-t", strtotime($firstDay));
        $leaveStmt->execute([$month, $year, $month, $year, $lastDay, $firstDay]);
        $leaves = $leaveStmt->fetchAll(PDO::FETCH_ASSOC);

        $leaveMap = [];
        foreach ($leaves as $leave) {
            $sid = trim($leave['StID']);
            $start = strtotime($leave['start_date']);
            $end = strtotime($leave['end_date']);
            for ($t = $start; $t <= $end; $t += 86400) {
                $d = date('Y-m-d', $t);
                $leaveMap[$sid][$d] = true;
            }
        }

        // 4. Prepare dates for the month
        $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
        
        $insertStmt = $conn->prepare("INSERT IGNORE INTO outside_work_records (StID, work_date, hours, rate, amount, reason, is_holiday) VALUES (?, ?, ?, ?, ?, ?, ?)");

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
                // Skip if staff is on leave this day
                if (isset($leaveMap[trim($stID)][$date])) {
                    continue;
                }

                $insertStmt->execute([
                    $stID,
                    $date,
                    $hours,
                    $rate,
                    $amount,
                    'ลงเวลาอัตโนมัติ',
                    $isHolidayFlag
                ]);
                if ($insertStmt->rowCount() > 0) $count++;
            }
        }

        $conn->commit();
        echo json_encode(["success" => true, "message" => "สร้างข้อมูลอัตโนมัติสำเร็จ จำนวน $count รายการ"]);
    }
} catch (Exception $e) {
    // Exception ธรรมดา (เช่น validate ไม่ผ่าน) ต้องถูกจับด้วย ไม่งั้นหลุดเป็น fatal error
    // และต้อง rollBack เพราะ auto_generate โยน exception ได้ระหว่างเปิด transaction อยู่
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
