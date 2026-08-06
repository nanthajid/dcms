<?php
require_once '../config.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->StID)) {
    try {
        // In a real app, you would hash the password. 
        // Following the current project style which seems to allow plain text or hash.
        // We'll reset it to the StID as requested.
        
        $query = "UPDATE users SET password = :password WHERE StID = :StID";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(":password", $data->StID);
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
