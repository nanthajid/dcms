<?php
require_once '../config.php';

$action = $_GET['action'] ?? '';
$jsonFile = __DIR__ . '/../../data/report_titles.json';

// Ensure data directory exists
if (!is_dir(dirname($jsonFile))) {
    mkdir(dirname($jsonFile), 0755, true);
}

// Initialize default structure if file doesn't exist
if (!file_exists($jsonFile)) {
    $defaultData = [
        'reportTitles' => [
            ['id' => '1', 'title' => 'รายงานสรุปการเบิกเงินค่าตอบแทนนอกเวลาราชการ'],
            ['id' => '2', 'title' => 'รายงานค่าตอบแทนนอกเวลา'],
            ['id' => '3', 'title' => 'สรุปค่าตอบแทนนอกเวลาราชการ']
        ],
        'selectedReportTitleId' => '1',
        'approverId' => '',
        'approverTitle' => '',
        'approverName' => '',
        'approverPostName' => ''
    ];
    file_put_contents($jsonFile, json_encode($defaultData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}


try {
    if ($action === 'list') {
        $data = json_decode(file_get_contents($jsonFile), true);
        echo json_encode([
            "success" => true,
            "data" => $data
        ]);
    }
    elseif ($action === 'add') {
        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput, true);

        if (!is_array($input) || empty($input['title']) || !is_string($input['title'])) {
            echo json_encode(["success" => false, "message" => "กรุณาระบุหัวข้อรายงาน"]);
            exit;
        }

        $data = json_decode(file_get_contents($jsonFile), true);
        $newId = (string)(max(array_map(fn($t) => (int)$t['id'], $data['reportTitles'])) + 1);

        $data['reportTitles'][] = [
            'id' => $newId,
            'title' => $input['title']
        ];

        if (file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
            echo json_encode([
                "success" => true,
                "message" => "เพิ่มหัวข้อรายงานสำเร็จ",
                "data" => $data
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกข้อมูลได้"]);
        }
    }
    elseif ($action === 'update') {
        $input = json_decode(file_get_contents("php://input"), true);

        if (empty($input['id']) || empty($input['title'])) {
            echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
            exit;
        }

        $data = json_decode(file_get_contents($jsonFile), true);
        $found = false;

        foreach ($data['reportTitles'] as &$title) {
            if ($title['id'] === $input['id']) {
                $title['title'] = $input['title'];
                $found = true;
                break;
            }
        }

        if (!$found) {
            echo json_encode(["success" => false, "message" => "ไม่พบรายการที่ต้องการแก้ไข"]);
            exit;
        }

        if (file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
            echo json_encode([
                "success" => true,
                "message" => "แก้ไขหัวข้อรายงานสำเร็จ",
                "data" => $data
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกข้อมูลได้"]);
        }
    }
    elseif ($action === 'delete') {
        $input = json_decode(file_get_contents("php://input"), true);

        if (empty($input['id'])) {
            echo json_encode(["success" => false, "message" => "กรุณาระบุรายการที่ต้องการลบ"]);
            exit;
        }

        $data = json_decode(file_get_contents($jsonFile), true);

        if (count($data['reportTitles']) <= 1) {
            echo json_encode(["success" => false, "message" => "ต้องมีหัวข้อรายงานอย่างน้อย 1 รายการ"]);
            exit;
        }

        $data['reportTitles'] = array_filter($data['reportTitles'], fn($t) => $t['id'] !== $input['id']);
        $data['reportTitles'] = array_values($data['reportTitles']);

        // If deleted title was selected, select the first one
        if ($data['selectedReportTitleId'] === $input['id']) {
            $data['selectedReportTitleId'] = $data['reportTitles'][0]['id'];
        }

        if (file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
            echo json_encode([
                "success" => true,
                "message" => "ลบหัวข้อรายงานสำเร็จ",
                "data" => $data
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกข้อมูลได้"]);
        }
    }
    elseif ($action === 'select') {
        $input = json_decode(file_get_contents("php://input"), true);

        if (empty($input['id'])) {
            echo json_encode(["success" => false, "message" => "กรุณาระบุรายการที่ต้องการเลือก"]);
            exit;
        }

        $data = json_decode(file_get_contents($jsonFile), true);
        $data['selectedReportTitleId'] = $input['id'];

        if (file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
            echo json_encode([
                "success" => true,
                "message" => "เลือกหัวข้อรายงานสำเร็จ",
                "data" => $data
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกข้อมูลได้"]);
        }
    }
    elseif ($action === 'save_approver') {
        $input = json_decode(file_get_contents("php://input"), true);

        $data = json_decode(file_get_contents($jsonFile), true);
        $data['approverId'] = $input['approverId'] ?? '';
        $data['approverTitle'] = $input['approverTitle'] ?? '';
        $data['approverName'] = $input['approverName'] ?? '';
        $data['approverPostName'] = $input['approverPostName'] ?? '';

        if (file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
            echo json_encode([
                "success" => true,
                "message" => "บันทึกผู้รับรองการปฏิบัติงานสำเร็จ",
                "data" => $data
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกข้อมูลได้"]);
        }
    }
} catch (Exception $e) {

    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
