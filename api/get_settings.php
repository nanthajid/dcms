<?php
require_once 'config.php';

try {
    $stmt = $conn->prepare("SELECT setting_key, setting_value FROM settings");
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $settings = [];
    foreach ($data as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    // Defaults if table or keys don't exist
    if (!isset($settings['agency_name'])) {
        $settings['agency_name'] = 'สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒';
    }

    echo json_encode(["success" => true, "data" => $settings]);
} catch(PDOException $e) {
    // If table doesn't exist yet, return defaults
    echo json_encode([
        "success" => true, 
        "data" => [
            "agency_name" => "สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒"
        ]
    ]);
}
?>
