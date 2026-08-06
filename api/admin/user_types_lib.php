<?php
/**
 * ประเภทผู้ใช้งาน (user_type) และสิทธิ์การเข้าถึงเมนู
 *
 * - ตาราง user_types เก็บประเภทที่ใช้ได้ (เพิ่ม/ลบได้จากหน้าจัดการ)
 * - สิทธิ์เมนูเก็บเป็น JSON map {code: [menuKey,...]} ในตาราง settings
 * - user_type = admin เป็น superuser เข้าถึงได้ทุกเมนูเสมอ ไม่เก็บสิทธิ์และแก้ไม่ได้
 */

const SUPERUSER_TYPE = 'admin';
const PERMISSION_SETTING_KEY = 'menu_permissions';
const LEGACY_PERMISSION_KEY = 'menu_permissions_staff';

// ต้องตรงกับ MENU_CATALOG ใน src/config/menuAccess.ts
const MENU_KEYS = [
    'dashboard',
    'staff',
    'outside-work',
    'outside-work-leave',
    'outside-work-special',
    'outside-work-special-leave',
    'counselors',
    'appointments',
    'wfh',
    'reports',
    'work-rates',
    'settings',
];

// เมนูย่อย ต้องตรงกับ SUBMENU_CATALOG ใน src/config/menuAccess.ts
const SUBMENU_KEYS = [
    'reports.monthly',
    'reports.executive',
    'reports.editable',
];

// สิทธิ์ระดับปุ่ม ต้องตรงกับ ACTION_CATALOG ใน src/config/menuAccess.ts
const ACTION_KEYS = [
    'staff.edit',
    'staff.delete',
];

/** คีย์ทั้งหมดที่ยอมรับได้ตอนบันทึกสิทธิ์ */
function allAccessKeys(): array
{
    return array_merge(MENU_KEYS, SUBMENU_KEYS, ACTION_KEYS);
}

/** ประเภทที่สร้างใหม่เริ่มด้วยสิทธิ์ขั้นต่ำ ให้ผู้ดูแลติ๊กเพิ่มเอง */
function defaultMenusForNewType(): array
{
    return ['dashboard'];
}

/**
 * ค่าเริ่มต้นของ staff = พฤติกรรมเดิมของระบบ (ทุกเมนูยกเว้นข้อมูลเจ้าหน้าที่)
 * ไม่รวมสิทธิ์ระดับปุ่ม เพราะ staff ไม่เห็นหน้าข้อมูลเจ้าหน้าที่อยู่แล้ว
 */
function defaultStaffMenus(): array
{
    return array_values(array_merge(
        array_filter(MENU_KEYS, fn($key) => $key !== 'staff'),
        SUBMENU_KEYS
    ));
}

function ensureUserTypeSchema(PDO $conn): void
{
    $conn->exec("CREATE TABLE IF NOT EXISTS `settings` (
        `setting_key` varchar(50) NOT NULL,
        `setting_value` text DEFAULT NULL,
        PRIMARY KEY (`setting_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conn->exec("CREATE TABLE IF NOT EXISTS `user_types` (
        `code` varchar(30) NOT NULL,
        `name` varchar(100) NOT NULL,
        `is_system` tinyint(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (`code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // seed ประเภทพื้นฐาน (ลบไม่ได้)
    $seed = $conn->prepare("INSERT IGNORE INTO user_types (code, name, is_system) VALUES (?, ?, 1)");
    $seed->execute([SUPERUSER_TYPE, 'ผู้ดูแลระบบ']);
    $seed->execute(['staff', 'เจ้าหน้าที่']);

    // users.user_type เดิมเป็น ENUM ซึ่งเก็บประเภทใหม่ไม่ได้ -> ขยายเป็น VARCHAR (ทำครั้งเดียว)
    $column = $conn->query("SHOW COLUMNS FROM users LIKE 'user_type'")->fetch(PDO::FETCH_ASSOC);
    if ($column && stripos($column['Type'], 'enum') === 0) {
        $conn->exec("ALTER TABLE users MODIFY COLUMN user_type VARCHAR(30) NOT NULL DEFAULT 'staff'");
    }
}

function getUserTypes(PDO $conn): array
{
    $stmt = $conn->query("SELECT code, name, is_system FROM user_types ORDER BY is_system DESC, code ASC");
    $types = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $types[] = [
            'code' => $row['code'],
            'name' => $row['name'],
            'is_system' => (int)$row['is_system'] === 1,
        ];
    }
    return $types;
}

/**
 * ตรวจ user_type ที่ส่งมาจากฟอร์ม ให้เป็นรหัสที่มีอยู่จริงในตาราง user_types เท่านั้น
 * ค่าที่ไม่รู้จักตกกลับเป็น staff (สิทธิ์ต่ำสุดที่ใช้งานได้)
 */
function normalizeUserType(PDO $conn, ?string $type): string
{
    $type = trim((string)$type);
    $validCodes = array_column(getUserTypes($conn), 'code');

    return in_array($type, $validCodes, true) ? $type : 'staff';
}

function getMenuPermissions(PDO $conn): array
{
    $stmt = $conn->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
    $stmt->execute([PERMISSION_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $permissions = [];
    if ($row && !empty($row['setting_value'])) {
        $decoded = json_decode($row['setting_value'], true);
        if (is_array($decoded)) $permissions = $decoded;
    } else {
        // ย้ายค่าจากคีย์เดิมที่เก็บเฉพาะสิทธิ์ของ staff
        $legacy = $conn->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
        $legacy->execute([LEGACY_PERMISSION_KEY]);
        $legacyRow = $legacy->fetch(PDO::FETCH_ASSOC);

        if ($legacyRow && !empty($legacyRow['setting_value'])) {
            $decoded = json_decode($legacyRow['setting_value'], true);
            if (is_array($decoded)) $permissions['staff'] = $decoded;
        }
    }

    // เติมค่าเริ่มต้นให้ประเภทที่ยังไม่เคยตั้งสิทธิ์ และกรองคีย์เมนูที่ไม่มีแล้วทิ้ง
    foreach (getUserTypes($conn) as $type) {
        $code = $type['code'];
        if ($code === SUPERUSER_TYPE) continue;

        if (!isset($permissions[$code]) || !is_array($permissions[$code])) {
            $permissions[$code] = $code === 'staff' ? defaultStaffMenus() : defaultMenusForNewType();
        } else {
            $permissions[$code] = array_values(array_intersect($permissions[$code], allAccessKeys()));

            // ข้อมูลที่บันทึกไว้ก่อนมีเมนูย่อย: มีสิทธิ์ 'reports' แต่ไม่มีลูกสักอัน
            // ถ้าไม่เติมให้ เมนูรายงานจะหายไปเองหลังอัปเดต
            $hasParent = in_array('reports', $permissions[$code], true);
            $hasAnyChild = count(array_intersect($permissions[$code], SUBMENU_KEYS)) > 0;
            if ($hasParent && !$hasAnyChild) {
                $permissions[$code] = array_values(array_merge($permissions[$code], SUBMENU_KEYS));
            }
        }
    }

    return $permissions;
}

function saveMenuPermissions(PDO $conn, array $permissions): void
{
    $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
                            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    $stmt->execute([PERMISSION_SETTING_KEY, json_encode($permissions, JSON_UNESCAPED_UNICODE)]);
}
