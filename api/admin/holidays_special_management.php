<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$action = $_GET['action'] ?? '';

try {
    // Ensure holidays_special table exists (แยกอิสระจากตาราง holidays ของหน้าปกติ)
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS `holidays_special` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `holiday_date` date NOT NULL,
            `name` varchar(255) NOT NULL,
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `holiday_date` (`holiday_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        // Table might already exist, ignore error
    }

    if ($action === 'list') {
        $stmt = $conn->query("SELECT * FROM holidays_special ORDER BY holiday_date ASC");
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->holiday_date) && !empty($data->name)) {
            $stmt = $conn->prepare("INSERT INTO holidays_special (holiday_date, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)");
            $stmt->execute([$data->holiday_date, $data->name]);
            echo json_encode(["success" => true, "message" => "บันทึกข้อมูลวันหยุดสำเร็จ"]);
        } else {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
        }
    }
    elseif ($action === 'delete') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            $stmt = $conn->prepare("DELETE FROM holidays_special WHERE id = ?");
            $stmt->execute([$data->id]);
            echo json_encode(["success" => true, "message" => "ลบข้อมูลสำเร็จ"]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
