<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->StPost)) {
    try {
        // Check if any staff is using this position
        $check_staff = $conn->prepare("SELECT StID FROM staffs WHERE StPost = ? LIMIT 1");
        $check_staff->execute([$data->StPost]);
        if ($check_staff->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้งานตำแหน่งนี้อยู่"]);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM positions WHERE StPost = ?");
        if ($stmt->execute([$data->StPost])) {
            echo json_encode(["success" => true, "message" => "ลบตำแหน่งสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถลบข้อมูลได้"]);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
}
?>
