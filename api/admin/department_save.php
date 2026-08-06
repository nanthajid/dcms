<?php
require_once '../config.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->DepNo) && !empty($data->DepName)) {
    try {
        $check = $conn->prepare("SELECT DepNo FROM departments WHERE DepNo = ?");
        $check->execute([$data->DepNo]);
        if ($check->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "รหัสฝ่ายนี้มีอยู่แล้ว"]);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO departments (DepNo, DepName) VALUES (?, ?)");
        if ($stmt->execute([$data->DepNo, $data->DepName])) {
            echo json_encode(["success" => true, "message" => "เพิ่มฝ่ายสำเร็จ"]);
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
