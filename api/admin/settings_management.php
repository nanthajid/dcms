<?php
require_once '../config.php';

$action = isset($_GET['action']) ? $_GET['action'] : 'get';

try {
    // Ensure table exists
    $conn->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `setting_key` varchar(50) NOT NULL,
        `setting_value` text DEFAULT NULL,
        PRIMARY KEY (`setting_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    switch ($action) {
        case 'get':
            $stmt = $conn->prepare("SELECT * FROM settings");
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format as key-value pairs
            $settings = [];
            foreach ($data as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            
            // Provide defaults for keys that were never set
            // (ใช้ merge แทนการเช็คว่าว่างทั้งตาราง เพราะตาราง settings ถูกใช้ร่วมกับค่าธรรมเนียมด้วย)
            $settings = array_merge([
                'agency_name' => 'สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒',
                'director_post_id' => 'P12'
            ], $settings);
            
            echo json_encode(["success" => true, "data" => $settings]);
            break;

        case 'save':
            $data = json_decode(file_get_contents("php://input"), true);
            if (!empty($data)) {
                foreach ($data as $key => $value) {
                    $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (:key, :value) 
                                           ON DUPLICATE KEY UPDATE setting_value = :value2");
                    $stmt->bindParam(":key", $key);
                    $stmt->bindParam(":value", $value);
                    $stmt->bindParam(":value2", $value);
                    $stmt->execute();
                }
                echo json_encode(["success" => true, "message" => "บันทึกการตั้งค่าสำเร็จ"]);
            } else {
                echo json_encode(["success" => false, "message" => "ไม่มีข้อมูลให้บันทึก"]);
            }
            break;

        default:
            echo json_encode(["success" => false, "message" => "Action not found"]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
