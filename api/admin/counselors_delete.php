<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id)) {
    try {
        $query = "DELETE FROM counselors WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $data->id);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "ลบข้อมูลสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถลบข้อมูลได้"]);
        }
    } catch(PDOException $exception) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $exception->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ไม่พบ ID ที่ต้องการลบ"]);
}
?>
