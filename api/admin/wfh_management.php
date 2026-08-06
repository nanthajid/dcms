<?php
require_once '../config.php';

$action = $_GET['action'] ?? '';

try {
    if ($action === 'list') {
        $query = "SELECT w.*, s.StName, p.StPostName, d.DepName, s.DepNo 
                  FROM wfh_records w
                  LEFT JOIN staffs s ON TRIM(w.StID) = TRIM(s.StID)
                  LEFT JOIN positions p ON s.StPost = p.StPost
                  LEFT JOIN departments d ON s.DepNo = d.DepNo
                  ORDER BY w.start_date ASC, w.StID ASC";
        $stmt = $conn->query($query);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } 
    elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->StID) && !empty($data->dates)) {
            try {
                $conn->beginTransaction();

                // 1. Check Eligibility (PostType != 'T1')
                $stmt = $conn->prepare("SELECT p.PostType 
                                        FROM staffs s 
                                        JOIN positions p ON s.StPost = p.StPost 
                                        WHERE s.StID = ?");
                $stmt->execute([$data->StID]);
                $staff = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$staff) {
                    throw new Exception("ไม่พบข้อมูลเจ้าหน้าที่");
                }
                
                if (($staff['PostType'] ?? '') === 'T1') {
                    throw new Exception("เจ้าหน้าที่ประเภท T1 ไม่ได้รับอนุญาตให้ WFH");
                }

                // 2. Process dates and check quota (max 3 days/month)
                if (is_array($data->dates)) {
                    // Group dates by month to check quota
                    $months = [];
                    foreach ($data->dates as $date) {
                        $month = date('Y-m', strtotime($date));
                        if (!isset($months[$month])) $months[$month] = 0;
                        $months[$month]++;
                    }

                    foreach ($months as $month => $count) {
                        // Count existing records for this month
                        $stmt = $conn->prepare("SELECT COUNT(*) FROM wfh_records 
                                                WHERE StID = ? AND DATE_FORMAT(start_date, '%Y-%m') = ?");
                        $stmt->execute([$data->StID, $month]);
                        $existing = $stmt->fetchColumn();
                        
                        if (($existing + $count) > 3) {
                            $monthThai = date('n', strtotime($month . '-01'));
                            $yearThai = date('Y', strtotime($month . '-01')) + 543;
                            throw new Exception("เจ้าหน้าที่ท่านนี้มีโควตา WFH เกิน 3 วัน ในเดือน " . $monthThai . "/" . $yearThai);
                        }
                    }

                    // Batch insert
                    $stmt = $conn->prepare("INSERT INTO wfh_records (StID, start_date, end_date, reason) VALUES (?, ?, ?, ?)");
                    foreach ($data->dates as $date) {
                        $stmt->execute([$data->StID, $date, $date, $data->reason ?? '']);
                    }
                }
                
                $conn->commit();
                echo json_encode(["success" => true, "message" => "บันทึกข้อมูล WFH สำเร็จ"]);
            } catch (Exception $e) {
                if ($conn->inTransaction()) $conn->rollBack();
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        }
    }
    elseif ($action === 'delete') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            $stmt = $conn->prepare("DELETE FROM wfh_records WHERE id = ?");
            $stmt->execute([$data->id]);
            echo json_encode(["success" => true, "message" => "ลบข้อมูลสำเร็จ"]);
        }
    }
    elseif ($action === 'clear') {
        $data = json_decode(file_get_contents("php://input"));
        $month = $data->month ?? null;
        $year = $data->year ?? null;

        if ($month && $year) {
            $stmt = $conn->prepare("DELETE FROM wfh_records WHERE MONTH(start_date) = ? AND YEAR(start_date) = ?");
            $stmt->execute([$month, $year]);
            echo json_encode(["success" => true, "message" => "ล้างข้อมูล WFH ประจำเดือนสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
