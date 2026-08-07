<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();
require_once __DIR__ . '/work_rate_config.php';

$action = $_GET['action'] ?? 'get';

try {
    if ($action === 'get') {
        ensureSettingsTable($conn);
        echo json_encode([
            "success"  => true,
            "data"     => getWorkRateConfig($conn),
            "defaults" => WORK_RATE_DEFAULTS
        ]);
    }
    elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data)) {
            echo json_encode(["success" => false, "message" => "ไม่มีข้อมูลให้บันทึก"]);
            exit;
        }

        ensureSettingsTable($conn);

        $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
                                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");

        $saved = 0;
        foreach (WORK_RATE_DEFAULTS as $key => $default) {
            if (!array_key_exists($key, $data)) continue;

            $value = $data[$key];
            if (!is_numeric($value) || (float)$value < 0) {
                echo json_encode(["success" => false, "message" => "ค่าที่กรอกต้องเป็นตัวเลขและไม่ติดลบ ($key)"]);
                exit;
            }

            $stmt->execute([$key, (string)(float)$value]);
            $saved++;
        }

        if ($saved === 0) {
            echo json_encode(["success" => false, "message" => "ไม่มีข้อมูลให้บันทึก"]);
            exit;
        }

        echo json_encode([
            "success" => true,
            "message" => "บันทึกค่าธรรมเนียมสำเร็จ",
            "data"    => getWorkRateConfig($conn)
        ]);
    }
    elseif ($action === 'reset') {
        ensureSettingsTable($conn);

        $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
                                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        foreach (WORK_RATE_DEFAULTS as $key => $default) {
            $stmt->execute([$key, (string)(float)$default]);
        }

        echo json_encode([
            "success" => true,
            "message" => "คืนค่าเริ่มต้นของระบบสำเร็จ",
            "data"    => getWorkRateConfig($conn)
        ]);
    }
    else {
        echo json_encode(["success" => false, "message" => "Action not found"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
