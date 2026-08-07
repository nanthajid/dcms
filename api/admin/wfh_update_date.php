<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->new_date)) {
    try {
        // Update both start and end date to the same new date (since we move single days)
        $query = "UPDATE wfh_records SET start_date = :new_date, end_date = :new_date WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            ":new_date" => $data->new_date,
            ":id" => $data->id
        ]);
        
        echo json_encode(["success" => true, "message" => "ย้ายวันปฏิบัติงานสำเร็จ"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
}
?>
