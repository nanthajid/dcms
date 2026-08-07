<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

$action = $_GET['action'] ?? '';
$dataFile = dirname(__DIR__) . '/data/report_titles.json';

// Ensure data directory exists
if (!is_dir(dirname($dataFile))) {
    mkdir(dirname($dataFile), 0755, true);
}

// Initialize with default data if file doesn't exist
if (!file_exists($dataFile)) {
    $defaultData = [
        'titles' => [
            ['id' => '1', 'title' => 'รายงานสรุปการเบิกเงินค่าตอบแทนนอกเวลาราชการ (กรณีพิเศษ)'],
            ['id' => '2', 'title' => 'รายงานค่าตอบแทนนอกเวลา (กรณีพิเศษ)'],
            ['id' => '3', 'title' => 'สรุปค่าตอบแทนนอกเวลาราชการ (กรณีพิเศษ)']
        ],
        'selectedId' => '1',
        'approverId' => '',
        'approverTitle' => '',
        'approverName' => '',
        'approverPostName' => ''
    ];
    file_put_contents($dataFile, json_encode($defaultData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}


try {
    if ($action === 'list') {
        $data = json_decode(file_get_contents($dataFile), true);
        echo json_encode(["success" => true, "data" => $data]);
    }
    elseif ($action === 'add') {
        $input = json_decode(file_get_contents("php://input"), true);
        $data = json_decode(file_get_contents($dataFile), true);

        $newId = (max(array_column($data['titles'], 'id')) ?: 0) + 1;
        $data['titles'][] = [
            'id' => (string)$newId,
            'title' => $input['title'] ?? ''
        ];

        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["success" => true, "message" => "เพิ่มหัวข้อรายงานสำเร็จ"]);
    }
    elseif ($action === 'update') {
        $input = json_decode(file_get_contents("php://input"), true);
        $data = json_decode(file_get_contents($dataFile), true);

        foreach ($data['titles'] as &$title) {
            if ($title['id'] === $input['id']) {
                $title['title'] = $input['title'];
                break;
            }
        }

        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["success" => true, "message" => "แก้ไขหัวข้อรายงานสำเร็จ"]);
    }
    elseif ($action === 'delete') {
        $input = json_decode(file_get_contents("php://input"), true);
        $data = json_decode(file_get_contents($dataFile), true);

        if (count($data['titles']) <= 1) {
            echo json_encode(["success" => false, "message" => "ต้องมีหัวข้อรายงานอย่างน้อย 1 รายการ"]);
            exit;
        }

        $data['titles'] = array_filter($data['titles'], fn($t) => $t['id'] !== $input['id']);

        if ($data['selectedId'] === $input['id']) {
            $data['selectedId'] = $data['titles'][0]['id'] ?? '1';
        }

        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["success" => true, "message" => "ลบหัวข้อรายงานสำเร็จ"]);
    }
    elseif ($action === 'select') {
        $input = json_decode(file_get_contents("php://input"), true);
        $data = json_decode(file_get_contents($dataFile), true);

        $data['selectedId'] = $input['id'];
        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["success" => true, "message" => "เลือกหัวข้อรายงานสำเร็จ"]);
    }
    elseif ($action === 'save_approver') {
        $input = json_decode(file_get_contents("php://input"), true);
        $data = json_decode(file_get_contents($dataFile), true);

        $data['approverId'] = $input['approverId'] ?? '';
        $data['approverTitle'] = $input['approverTitle'] ?? '';
        $data['approverName'] = $input['approverName'] ?? '';
        $data['approverPostName'] = $input['approverPostName'] ?? '';

        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["success" => true, "message" => "บันทึกผู้รับรองการปฏิบัติงานสำเร็จ", "data" => $data]);
    }
    else {

        echo json_encode(["success" => false, "message" => "Invalid action"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
