<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->StID)) {
    try {
        // รหัสผ่านใหม่ = รหัสเจ้าหน้าที่ (ตามที่ระบบออกแบบไว้) แต่เก็บเป็น hash
        $newPassword = hashPassword((string)$data->StID);

        $query = "UPDATE users SET password = :password WHERE StID = :StID";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(":password", $newPassword);
        $stmt->bindParam(":StID", $data->StID);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "รีเซ็ตรหัสผ่านสำเร็จ (รหัสผ่านใหม่คือรหัสเจ้าหน้าที่)"]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถรีเซ็ตรหัสผ่านได้"]);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
}
?>
