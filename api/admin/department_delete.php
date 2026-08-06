<?php
require_once '../config.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->DepNo)) {
    try {
        // Check if any staff is using this department
        $check_staff = $conn->prepare("SELECT StID FROM staffs WHERE DepNo = ? LIMIT 1");
        $check_staff->execute([$data->DepNo]);
        if ($check_staff->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "ไม่สามารถลบได้ เนื่องจากมีเจ้าหน้าที่ใช้งานฝ่ายนี้อยู่"]);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM departments WHERE DepNo = ?");
        if ($stmt->execute([$data->DepNo])) {
            echo json_encode(["success" => true, "message" => "ลบฝ่ายสำเร็จ"]);
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
