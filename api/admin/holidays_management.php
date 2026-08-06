<?php
require_once '../config.php';

$action = $_GET['action'] ?? '';

try {
    if ($action === 'list') {
        $stmt = $conn->query("SELECT * FROM holidays ORDER BY holiday_date ASC");
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } 
    elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->holiday_date) && !empty($data->name)) {
            $stmt = $conn->prepare("INSERT INTO holidays (holiday_date, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)");
            $stmt->execute([$data->holiday_date, $data->name]);
            echo json_encode(["success" => true, "message" => "บันทึกข้อมูลวันหยุดสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        }
    }
    elseif ($action === 'delete') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            $stmt = $conn->prepare("DELETE FROM holidays WHERE id = ?");
            $stmt->execute([$data->id]);
            echo json_encode(["success" => true, "message" => "ลบข้อมูลสำเร็จ"]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
