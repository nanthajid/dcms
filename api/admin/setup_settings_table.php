<?php
require_once '../config.php';

try {
    $conn->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `setting_key` varchar(50) NOT NULL,
        `setting_value` text DEFAULT NULL,
        PRIMARY KEY (`setting_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Insert default settings if not exists
    $defaults = [
        ['agency_name', 'สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒'],
        ['director_post_id', 'P12']
    ];

    foreach ($defaults as $default) {
        $stmt = $conn->prepare("INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->execute($default);
    }

    echo json_encode(["success" => true, "message" => "Settings table created and defaults inserted."]);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
