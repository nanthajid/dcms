<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->StPost) && !empty($data->StPostName)) {
    try {
        $check = $conn->prepare("SELECT StPost FROM positions WHERE StPost = ?");
        $check->execute([$data->StPost]);
        if ($check->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "รหัสตำแหน่งนี้มีอยู่แล้ว"]);
            exit;
        }

        $postType = !empty($data->PostType) ? $data->PostType : null;

        $stmt = $conn->prepare("INSERT INTO positions (StPost, StPostName, PostType) VALUES (?, ?, ?)");
        if ($stmt->execute([$data->StPost, $data->StPostName, $postType])) {
            echo json_encode(["success" => true, "message" => "เพิ่มตำแหน่งสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกได้"]);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
}
?>
