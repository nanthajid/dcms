<?php
require_once 'config.php';
require_once 'auth.php';

// Handle preflight OPTIONS request handled in config.php

// Get POST data
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->password)) {
    try {
        // Check if StID column exists to avoid 500 error if migration hasn't run
        $checkCol = $conn->query("SHOW COLUMNS FROM users LIKE 'StID'");
        $hasStID = $checkCol->rowCount() > 0;
        
        $selectFields = "id, username, password, fullname, user_type" . ($hasStID ? ", StID" : "");
        $query = "SELECT $selectFields FROM users WHERE username = :username LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(":username", $data->username);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $isValid = false;

            if (looksHashed($row['password'])) {
                $isValid = password_verify($data->password, $row['password']);

                // อัลกอริทึมเริ่มต้นของ PHP เปลี่ยนได้ตามเวอร์ชัน อัปเกรดให้ตอนล็อกอิน
                if ($isValid && password_needs_rehash($row['password'], PASSWORD_DEFAULT)) {
                    $up = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                    $up->execute([hashPassword($data->password), $row['id']]);
                }
            } else {
                // ข้อมูลเก่าที่ยังเป็น plaintext — ปกติถูก migrate ไปหมดแล้ว
                // เหลือไว้กันคนตกหล่นล็อกอินไม่ได้ ถ้าเจอให้แปลงเป็น hash ทันที
                $isValid = hash_equals((string)$row['password'], (string)$data->password);
                if ($isValid) {
                    $up = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                    $up->execute([hashPassword($data->password), $row['id']]);
                }
            }

            if ($isValid) {
                // ประเภทที่เข้าหลังบ้านได้ = ประเภทที่มีอยู่ในตาราง user_types
                // (ตารางยังไม่ถูกสร้าง = ระบบเก่า ใช้ 2 ประเภทพื้นฐานไปก่อน)
                $allowedTypes = ['admin', 'staff'];
                $hasTypeTable = $conn->query("SHOW TABLES LIKE 'user_types'")->rowCount() > 0;
                if ($hasTypeTable) {
                    $typeCodes = $conn->query("SELECT code FROM user_types")->fetchAll(PDO::FETCH_COLUMN);
                    if (!empty($typeCodes)) $allowedTypes = $typeCodes;
                }

                if (in_array($row['user_type'], $allowedTypes, true)) {
                    $user = [
                        "id" => $row['id'],
                        "username" => $row['username'],
                        "fullname" => $row['fullname'],
                        "user_type" => $row['user_type'],
                        "StID" => $row['StID'] ?? null
                    ];

                    // ตัวจริงที่ใช้ตรวจสิทธิ์คือ session ฝั่งเซิร์ฟเวอร์
                    loginUser($user);

                    // token ยังส่งให้อยู่เพราะหน้าเว็บใช้เป็นสัญญาณว่าล็อกอินแล้ว
                    // แต่ไม่ได้ใช้ตรวจสิทธิ์อีกต่อไป (ของเดิมสุ่มทิ้งเฉย ๆ ตรวจอะไรไม่ได้)
                    $token = bin2hex(openssl_random_pseudo_bytes(16));
                    if (!$token) $token = md5(uniqid(rand(), true));

                    echo json_encode([
                        "success" => true,
                        "token" => $token,
                        "user" => $user
                    ]);
                } else {
                    echo json_encode(["success" => false, "message" => "คุณไม่มีสิทธิ์เข้าถึงระบบจัดการ"]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "รหัสผ่านไม่ถูกต้อง"]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "ไม่พบชื่อผู้ใช้งานนี้"]);
        }
    } catch(PDOException $exception) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $exception->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "กรุณากรอกข้อมูลให้ครบถ้วน"]);
}
?>
