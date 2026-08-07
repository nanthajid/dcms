<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->StID)) {
    try {
        $conn->beginTransaction();

        $stmt = $conn->prepare("DELETE FROM staffs WHERE StID = ?");
        $stmt->execute([$data->StID]);

        $user_stmt = $conn->prepare("DELETE FROM users WHERE StID = ?");
        $user_stmt->execute([$data->StID]);

        $conn->commit();
        echo json_encode(["success" => true, "message" => "ลบข้อมูลเจ้าหน้าที่และบัญชีผู้ใช้งานสำเร็จ"]);
    } catch(PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
    }
}
 else {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
}
?>