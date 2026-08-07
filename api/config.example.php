<?php
// แม่แบบของ api/config.php — คัดลอกเป็น config.php แล้วใส่ค่าจริง
// config.php ตัวจริงถูก .gitignore ไว้ เพราะเก็บรหัสผ่านฐานข้อมูลของแต่ละเครื่อง/เซิร์ฟเวอร์

// CORS + header พื้นฐาน อยู่ในไฟล์แยกเพราะไฟล์นี้มีรหัสผ่าน DB ส่งขึ้นเซิร์ฟเวอร์ไม่ได้
require_once __DIR__ . '/cors.php';

$host = "localhost";
$db_name = "YOUR_DB_NAME";
$username = "YOUR_DB_USER";
$password = "YOUR_DB_PASSWORD";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8mb4");
} catch(PDOException $exception) {
    http_response_code(500);
    echo json_encode(["message" => "Connection error: " . $exception->getMessage()]);
    exit;
}
?>
