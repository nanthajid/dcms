<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

// Get JSON data from request body
$data = json_decode(file_get_contents("php://input"), true);

$PostType = $data['PostType'] ?? '';
$PostTypeName = $data['PostTypeName'] ?? '';

if (!empty($PostType) && !empty($PostTypeName)) {
    try {
        // Check if PostType already exists
        $check = $conn->prepare("SELECT PostType FROM post_type WHERE PostType = ?");
        $check->execute([$PostType]);
        if ($check->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "รหัสประเภทตำแหน่งนี้มีอยู่ในระบบแล้ว"]);
            exit;
        }

        $query = "INSERT INTO post_type (PostType, PostTypeName) VALUES (:PostType, :PostTypeName)";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(":PostType", $PostType);
        $stmt->bindParam(":PostTypeName", $PostTypeName);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "เพิ่มประเภทตำแหน่งสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถเพิ่มข้อมูลได้"]);
        }

    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
}
?>
