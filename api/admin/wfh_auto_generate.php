<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

// Action: auto_generate
// Parameters: month, year

$data = json_decode(file_get_contents("php://input"));
$month = $data->month ?? date('n');
$year = $data->year ?? date('Y');

try {
    $conn->beginTransaction();

    // 1. Get eligible staff (Not T1)
    $query = "SELECT s.StID, s.StName 
              FROM staffs s 
              JOIN positions p ON s.StPost = p.StPost 
              WHERE p.PostType != 'T1'";
    $staffs = $conn->query($query)->fetchAll(PDO::FETCH_ASSOC);

    // 2. Determine all weekdays in the target month
    $workDays = [];
    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
    for ($d = 1; $d <= $daysInMonth; $d++) {
        $time = mktime(0, 0, 0, $month, $d, $year);
        $dayOfWeek = date('N', $time);
        if ($dayOfWeek < 6) { // 1-5 = Mon-Fri
            $workDays[] = date('Y-m-d', $time);
        }
    }

    if (empty($workDays)) {
        throw new Exception("ไม่พบวันทำงานในเดือนที่เลือก");
    }

    $results = [
        "total_staff" => count($staffs),
        "generated" => 0,
        "already_full" => 0
    ];

    foreach ($staffs as $staff) {
        // 3. Check current quota for this month
        $stmt = $conn->prepare("SELECT start_date FROM wfh_records 
                                WHERE StID = ? AND DATE_FORMAT(start_date, '%Y-%m') = ?");
        $monthStr = sprintf('%04d-%02d', $year, $month);
        $stmt->execute([$staff['StID'], $monthStr]);
        $existingDates = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $currentCount = count($existingDates);
        if ($currentCount >= 3) {
            $results['already_full']++;
            continue;
        }

        $needed = 3 - $currentCount;
        
        // 4. Pick random available work days
        $availableDays = array_diff($workDays, $existingDates);
        if (count($availableDays) > 0) {
            shuffle($availableDays);
            $toAdd = array_slice($availableDays, 0, $needed);
            
            $insertStmt = $conn->prepare("INSERT INTO wfh_records (StID, start_date, end_date, reason) VALUES (?, ?, ?, 'ระบบสุ่มวันปฏิบัติงานอัตโนมัติ')");
            foreach ($toAdd as $date) {
                $insertStmt->execute([$staff['StID'], $date, $date]);
                $results['generated']++;
            }
        }
    }

    $conn->commit();
    echo json_encode([
        "success" => true, 
        "message" => "จัดตารางอัตโนมัติสำเร็จ: เพิ่ม " . $results['generated'] . " รายการ",
        "results" => $results
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
