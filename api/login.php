<?php
require_once 'config.php';

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
            
            // Check password (supports plain text for dev or hashed for prod)
            $isValid = false;
            if ($data->password === $row['password'] || password_verify($data->password, $row['password'])) {
                $isValid = true;
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
                    // Use a more compatible way to generate a token
                    $token = bin2hex(openssl_random_pseudo_bytes(16));
                    if (!$token) $token = md5(uniqid(rand(), true));

                    echo json_encode([
                        "success" => true,
                        "token" => $token, 
                        "user" => [
                            "id" => $row['id'],
                            "username" => $row['username'],
                            "fullname" => $row['fullname'],
                            "user_type" => $row['user_type'],
                            "StID" => $row['StID'] ?? null
                        ]
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
