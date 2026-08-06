<?php
require_once '../config.php';
require_once __DIR__ . '/user_types_lib.php';

$action = $_GET['action'] ?? 'get';

try {
    ensureUserTypeSchema($conn);

    if ($action === 'get') {
        echo json_encode([
            "success" => true,
            "data" => [
                "types" => getUserTypes($conn),
                "permissions" => getMenuPermissions($conn),
                "menuKeys" => MENU_KEYS,
                "submenuKeys" => SUBMENU_KEYS,
                "actionKeys" => ACTION_KEYS,
                "defaultMenus" => defaultMenusForNewType()
            ]
        ]);
    }
    elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['permissions']) || !is_array($data['permissions'])) {
            echo json_encode(["success" => false, "message" => "ข้อมูลสิทธิ์ไม่ถูกต้อง"]);
            exit;
        }

        $validCodes = array_column(getUserTypes($conn), 'code');
        $permissions = [];

        foreach ($data['permissions'] as $code => $menus) {
            // admin เข้าถึงได้ทุกเมนูเสมอ ไม่เก็บสิทธิ์ของ admin
            if ($code === SUPERUSER_TYPE) continue;
            if (!in_array($code, $validCodes, true) || !is_array($menus)) continue;

            $permissions[$code] = array_values(array_intersect($menus, allAccessKeys()));
        }

        saveMenuPermissions($conn, $permissions);

        echo json_encode([
            "success" => true,
            "message" => "บันทึกสิทธิ์การเข้าถึงสำเร็จ",
            "data" => ["permissions" => getMenuPermissions($conn)]
        ]);
    }
    elseif ($action === 'add_type') {
        $data = json_decode(file_get_contents("php://input"), true);

        $code = strtolower(trim($data['code'] ?? ''));
        $name = trim($data['name'] ?? '');

        if ($code === '' || $name === '') {
            echo json_encode(["success" => false, "message" => "กรุณาระบุรหัสและชื่อประเภทผู้ใช้งาน"]);
            exit;
        }
        // จำกัดรูปแบบ code เพราะถูกใช้เป็นคีย์ใน JSON สิทธิ์และเทียบตรง ๆ ตอนล็อกอิน
        if (!preg_match('/^[a-z][a-z0-9_]{1,29}$/', $code)) {
            echo json_encode(["success" => false, "message" => "รหัสต้องเป็น a-z, 0-9 หรือ _ ขึ้นต้นด้วยตัวอักษร ความยาว 2-30 ตัว"]);
            exit;
        }

        $check = $conn->prepare("SELECT code FROM user_types WHERE code = ?");
        $check->execute([$code]);
        if ($check->fetch()) {
            echo json_encode(["success" => false, "message" => "รหัสประเภทผู้ใช้งานนี้มีอยู่แล้ว"]);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO user_types (code, name, is_system) VALUES (?, ?, 0)");
        $stmt->execute([$code, $name]);

        // ประเภทใหม่เริ่มต้นด้วยสิทธิ์ขั้นต่ำ ให้ผู้ดูแลมาติ๊กเพิ่มเอง
        $permissions = getMenuPermissions($conn);
        $permissions[$code] = defaultMenusForNewType();
        saveMenuPermissions($conn, $permissions);

        echo json_encode([
            "success" => true,
            "message" => "เพิ่มประเภทผู้ใช้งานสำเร็จ",
            "data" => [
                "types" => getUserTypes($conn),
                "permissions" => getMenuPermissions($conn)
            ]
        ]);
    }
    elseif ($action === 'delete_type') {
        $data = json_decode(file_get_contents("php://input"), true);
        $code = trim($data['code'] ?? '');

        if ($code === '') {
            echo json_encode(["success" => false, "message" => "ไม่พบรหัสประเภทผู้ใช้งาน"]);
            exit;
        }

        $typeStmt = $conn->prepare("SELECT code, name, is_system FROM user_types WHERE code = ?");
        $typeStmt->execute([$code]);
        $type = $typeStmt->fetch(PDO::FETCH_ASSOC);

        if (!$type) {
            echo json_encode(["success" => false, "message" => "ไม่พบประเภทผู้ใช้งานนี้"]);
            exit;
        }
        if ((int)$type['is_system'] === 1) {
            echo json_encode(["success" => false, "message" => "ประเภทพื้นฐานของระบบ ลบไม่ได้"]);
            exit;
        }

        // กันข้อมูลกำพร้า: ถ้ายังมีผู้ใช้ผูกอยู่ต้องย้ายออกก่อน
        $countStmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE user_type = ?");
        $countStmt->execute([$code]);
        $inUse = (int)$countStmt->fetchColumn();

        if ($inUse > 0) {
            echo json_encode([
                "success" => false,
                "message" => "ยังมีผู้ใช้งาน $inUse คนใช้ประเภทนี้อยู่ กรุณาเปลี่ยนประเภทของผู้ใช้เหล่านั้นก่อน"
            ]);
            exit;
        }

        $conn->prepare("DELETE FROM user_types WHERE code = ?")->execute([$code]);

        $permissions = getMenuPermissions($conn);
        unset($permissions[$code]);
        saveMenuPermissions($conn, $permissions);

        echo json_encode([
            "success" => true,
            "message" => "ลบประเภทผู้ใช้งานสำเร็จ",
            "data" => [
                "types" => getUserTypes($conn),
                "permissions" => getMenuPermissions($conn)
            ]
        ]);
    }
    elseif ($action === 'update_user_types') {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['users']) || !is_array($data['users'])) {
            echo json_encode(["success" => false, "message" => "ไม่มีข้อมูลให้บันทึก"]);
            exit;
        }

        $validCodes = array_column(getUserTypes($conn), 'code');

        $conn->beginTransaction();

        $stmt = $conn->prepare("UPDATE users SET user_type = ? WHERE StID = ?");
        $updated = 0;

        foreach ($data['users'] as $user) {
            $stId = trim($user['StID'] ?? '');
            $userType = $user['user_type'] ?? '';

            if ($stId === '' || !in_array($userType, $validCodes, true)) {
                continue;
            }

            $stmt->execute([$userType, $stId]);
            $updated += $stmt->rowCount();
        }

        $conn->commit();

        echo json_encode([
            "success" => true,
            "message" => "อัปเดตประเภทผู้ใช้งานสำเร็จ $updated รายการ"
        ]);
    }
    else {
        echo json_encode(["success" => false, "message" => "Action not found"]);
    }
} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
