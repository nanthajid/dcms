<?php
require_once '../config.php';
require_once __DIR__ . '/work_rate_config.php';

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['id']) || empty($data['new_date'])) {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
    exit;
}

try {
    $conn->beginTransaction();

    // Get current leave info
    $getLeaveStmt = $conn->prepare("SELECT StID, start_date FROM staff_leaves WHERE id = ?");
    $getLeaveStmt->execute([$data['id']]);
    $leave = $getLeaveStmt->fetch(PDO::FETCH_ASSOC);

    if (!$leave) {
        $conn->rollBack();
        echo json_encode(["success" => false, "message" => "ไม่พบข้อมูลการลา"]);
        exit;
    }

    $stId    = trim($leave['StID']);
    $oldDate = $leave['start_date'];
    $newDate = $data['new_date'];

    // Update staff_leaves
    $conn->prepare("UPDATE staff_leaves SET start_date = ?, end_date = ? WHERE id = ?")
         ->execute([$newDate, $newDate, $data['id']]);

    $findStmt   = $conn->prepare("SELECT id FROM outside_work_records WHERE StID = ? AND work_date = ?");
    $updateStmt = $conn->prepare("UPDATE outside_work_records SET hours = 0, amount = 0 WHERE id = ?");
    $insertStmt = $conn->prepare("INSERT INTO outside_work_records (StID, work_date, hours, rate, amount, reason, is_holiday) VALUES (?, ?, 0, 0, 0, 'ลา', 0)");

    // Set hours=0 for new date
    $findStmt->execute([$stId, $newDate]);
    $existing = $findStmt->fetch(PDO::FETCH_ASSOC);
    if ($existing) {
        $updateStmt->execute([$existing['id']]);
    } else {
        $insertStmt->execute([$stId, $newDate]);
    }

    // Restore hours for old date
    if ($oldDate !== $newDate) {
        $holidayStmt = $conn->prepare("SELECT id FROM holidays WHERE holiday_date = ?");
        $holidayStmt->execute([$oldDate]);
        $isHoliday = (bool) $holidayStmt->fetch();

        $rateConfig = getWorkRateConfig($conn);
        list($hours, $rate) = resolveWorkRate($rateConfig, $oldDate, $isHoliday ? [$oldDate] : []);

        $conn->prepare("UPDATE outside_work_records SET hours = ?, amount = ? WHERE StID = ? AND work_date = ?")
             ->execute([$hours, $hours * $rate, $stId, $oldDate]);
    }

    $conn->commit();
    echo json_encode(["success" => true, "message" => "อัปเดตวันที่ลาเรียบร้อยแล้ว"]);

} catch(PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
