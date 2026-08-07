<?php
/**
 * แปลงรหัสผ่านที่เก็บเป็นข้อความตรง ๆ ให้เป็น hash — รันครั้งเดียวหลัง deploy
 *
 * ผู้ใช้ไม่ต้องเปลี่ยนรหัสผ่าน เพราะ hash สร้างจากรหัสเดิมที่เก็บอยู่
 * รหัสที่เคยใช้ล็อกอินยังใช้ได้เหมือนเดิม เปลี่ยนแค่รูปแบบการเก็บ
 *
 *   ?action=check    ดูว่าเหลือ plaintext กี่บัญชี (ไม่แก้อะไร)
 *   ?action=migrate  แปลงจริง
 *
 * หมายเหตุ: การแปลงเป็น hash ไม่ได้ทำให้รหัสที่รั่วไปแล้วปลอดภัยขึ้น
 * ยังต้องให้ทุกคนตั้งรหัสใหม่อยู่ดี ดู action=check เพื่อดูว่าใครยังใช้รหัสเดา
 */
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireSuperuser();

$action = $_GET['action'] ?? 'check';

try {
    $rows = $conn->query("SELECT id, username, password, StID FROM users")->fetchAll(PDO::FETCH_ASSOC);

    $plain = [];
    $empty = 0;
    foreach ($rows as $r) {
        if ($r['password'] === null || $r['password'] === '') { $empty++; continue; }
        if (!looksHashed($r['password'])) $plain[] = $r;
    }

    if ($action === 'check') {
        // บัญชีที่รหัสผ่านเดาได้ทันที (ตรงกับ username หรือ StID) ควรบังคับเปลี่ยนก่อนใคร
        $weak = 0;
        foreach ($plain as $r) {
            if ($r['password'] === $r['username'] || $r['password'] === $r['StID']) $weak++;
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "total"       => count($rows),
                "hashed"      => count($rows) - count($plain) - $empty,
                "plaintext"   => count($plain),
                "empty"       => $empty,
                "guessable"   => $weak,
            ],
            "message" => count($plain) === 0
                ? "รหัสผ่านทุกบัญชีเก็บเป็น hash แล้ว"
                : "ยังมี " . count($plain) . " บัญชีที่เก็บเป็นข้อความตรง ๆ"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action !== 'migrate') {
        echo json_encode(["success" => false, "message" => "ไม่รู้จักคำสั่ง: $action"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (empty($plain)) {
        echo json_encode([
            "success" => true,
            "message" => "ไม่มีอะไรต้องแปลง รหัสผ่านทุกบัญชีเป็น hash อยู่แล้ว",
            "data" => ["migrated" => 0]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ทำทีเดียวทั้งชุด ถ้าพังกลางทางจะได้ไม่เหลือครึ่ง ๆ กลาง ๆ
    $conn->beginTransaction();
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $migrated = 0;
    foreach ($plain as $r) {
        $stmt->execute([hashPassword($r['password']), $r['id']]);
        $migrated++;
    }
    $conn->commit();

    // อ่านซ้ำเพื่อยืนยันว่าไม่เหลือ plaintext จริง ๆ
    $left = 0;
    foreach ($conn->query("SELECT password FROM users")->fetchAll(PDO::FETCH_COLUMN) as $p) {
        if ($p !== null && $p !== '' && !looksHashed($p)) $left++;
    }

    echo json_encode([
        "success" => true,
        "message" => "แปลงรหัสผ่านเป็น hash แล้ว $migrated บัญชี (เหลือ plaintext $left บัญชี)",
        "data" => ["migrated" => $migrated, "remaining_plaintext" => $left]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
