<?php
require_once '../config.php';

$action = $_GET['action'] ?? 'list';

try {
    // Ensure suspended_work_data column exists
    try {
        $conn->query("ALTER TABLE staff_leaves ADD COLUMN suspended_work_data JSON DEFAULT NULL");
    } catch (Exception $e) {
        // Column might already exist, ignore error
    }

    if ($action === 'list') {
        $query = "SELECT 
                    sl.id, 
                    sl.StID, 
                    s.StName, 
                    sl.leave_type_id, 
                    lt.name as leave_name, 
                    lt.color, 
                    sl.start_date, 
                    sl.end_date, 
                    sl.reason, 
                    sl.status,
                    s.DepNo
                  FROM staff_leaves sl
                  LEFT JOIN staffs s ON sl.StID = s.StID
                  LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
                  ORDER BY sl.start_date DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $leaves = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(["success" => true, "data" => $leaves]);

    } elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"), true);

        $stIds = $data['StIDs'] ?? ($data['StID'] ? [$data['StID']] : []);

        if (empty($stIds) || empty($data['leave_type_id']) || empty($data['dates'])) {
            echo json_encode(["success" => false, "message" => "กรุณากรอกข้อมูลให้ครบถ้วน"]);
            exit;
        }

        $conn->beginTransaction();

        $insertLeaveStmt = $conn->prepare("INSERT INTO staff_leaves (StID, leave_type_id, start_date, end_date, reason, suspended_work_data) VALUES (?, ?, ?, ?, ?, ?)");
        $findOutsideStmt  = $conn->prepare("SELECT id, hours, rate, amount FROM outside_work_records WHERE StID = ? AND work_date = ?");
        $updateOutsideStmt = $conn->prepare("UPDATE outside_work_records SET hours = 0, amount = 0 WHERE id = ?");
        $insertOutsideStmt = $conn->prepare("INSERT INTO outside_work_records (StID, work_date, hours, rate, amount, reason, is_holiday) VALUES (?, ?, 0, 0, 0, 'ลา', 0)");

        // หมายเหตุ: ระบบลากลางนี้จัดการเฉพาะ outside_work_records (งานนอกเวลาปกติ) เท่านั้น
        // งานนอกเวลากรณีพิเศษ (outside_work_special_records) แยกจัดการที่ outside_work_special_management.php

        $debugLog = [];
        $suspendedData = [];

        foreach ($stIds as $rawStId) {
            $stId = trim($rawStId);
            foreach ($data['dates'] as $date) {
                $suspendedForThisDate = [];

                // Handle outside_work_records
                $findOutsideStmt->execute([$stId, $date]);
                $existing = $findOutsideStmt->fetch(PDO::FETCH_ASSOC);
                if ($existing) {
                    $suspendedForThisDate['outside_work'] = [
                        'id' => $existing['id'],
                        'hours' => $existing['hours'],
                        'rate' => $existing['rate'],
                        'amount' => $existing['amount']
                    ];
                    $updateOutsideStmt->execute([$existing['id']]);
                    $debugLog[] = "UPDATED id={$existing['id']} StID=$stId date=$date rows=" . $updateOutsideStmt->rowCount();
                } else {
                    $insertOutsideStmt->execute([$stId, $date]);
                    $debugLog[] = "INSERTED new record StID=$stId date=$date";
                }

                if (!empty($suspendedForThisDate)) {
                    $suspendedData[$date] = $suspendedForThisDate;
                }
            }

            // Get the first and last dates for this staff
            $firstDate = reset($data['dates']);
            $lastDate = end($data['dates']);

            $insertLeaveStmt->execute([
                $stId,
                $data['leave_type_id'],
                $firstDate,
                $lastDate,
                $data['reason'] ?? '',
                json_encode($suspendedData)
            ]);
        }

        $conn->commit();
        echo json_encode(["success" => true, "message" => "บันทึกข้อมูลวันลาเรียบร้อยแล้ว", "debug" => $debugLog]);

    } elseif ($action === 'delete') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['id'])) {
            echo json_encode(["success" => false, "message" => "ไม่พบรหัสที่ต้องการลบ"]);
            exit;
        }

        $conn->beginTransaction();
        try {
            $getLeaveStmt = $conn->prepare("SELECT StID, start_date, end_date, suspended_work_data FROM staff_leaves WHERE id = ?");
            $getLeaveStmt->execute([$data['id']]);
            $leave = $getLeaveStmt->fetch(PDO::FETCH_ASSOC);

            if (!$leave) {
                echo json_encode(["success" => false, "message" => "ไม่พบข้อมูลวันลา"]);
                exit;
            }

            $stId = trim($leave['StID']);
            $suspendedData = !empty($leave['suspended_work_data']) ? json_decode($leave['suspended_work_data'], true) : [];

            // Restore suspended work records (เฉพาะ outside_work_records — กรณีพิเศษแยกจัดการต่างหาก)
            if (!empty($suspendedData)) {
                $updateOutsideStmt = $conn->prepare("UPDATE outside_work_records SET hours = ?, rate = ?, amount = ? WHERE id = ?");
                $deleteOutsideStmt = $conn->prepare("DELETE FROM outside_work_records WHERE StID = ? AND work_date = ? AND reason = 'ลา' AND hours = 0");

                foreach ($suspendedData as $date => $dateData) {
                    // Restore outside_work_records
                    if (!empty($dateData['outside_work'])) {
                        $outsideData = $dateData['outside_work'];
                        $updateOutsideStmt->execute([
                            $outsideData['hours'],
                            $outsideData['rate'],
                            $outsideData['amount'],
                            $outsideData['id']
                        ]);
                    } else {
                        // If there was no original data, delete the placeholder record
                        $deleteOutsideStmt->execute([$stId, $date]);
                    }
                }
            } else {
                // No suspended data, just clean up zero-hour records
                $deleteOutsideStmt = $conn->prepare("DELETE FROM outside_work_records WHERE StID = ? AND work_date BETWEEN ? AND ? AND hours = 0 AND reason = 'ลา'");
                $deleteOutsideStmt->execute([$stId, $leave['start_date'], $leave['end_date']]);
            }

            // Delete the leave record
            $deleteLeaveStmt = $conn->prepare("DELETE FROM staff_leaves WHERE id = ?");
            if ($deleteLeaveStmt->execute([$data['id']])) {
                $conn->commit();
                echo json_encode(["success" => true, "message" => "ลบข้อมูลวันลาและคืนชั่วโมงการทำงานเรียบร้อยแล้ว"]);
            } else {
                throw new Exception("ลบข้อมูลไม่สำเร็จ");
            }
        } catch (Exception $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

} catch(PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
