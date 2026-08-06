<?php
// แม่แบบของ api/config.php — คัดลอกเป็น config.php แล้วใส่ค่าจริง
// config.php ตัวจริงถูก .gitignore ไว้ เพราะเก็บรหัสผ่านฐานข้อมูลของแต่ละเครื่อง/เซิร์ฟเวอร์

// Allow from any origin
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}

// Access-Control headers are received during OPTIONS requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");

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
