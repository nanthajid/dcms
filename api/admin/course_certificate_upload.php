<?php
/**
 * อัปโหลดไฟล์เกียรติบัตรของผู้เข้าอบรม (pdf / png / jpg)
 *
 * ไฟล์นี้เก็บไฟล์แล้วคืน path กลับไปอย่างเดียว ไม่เขียนฐานข้อมูล
 * เพราะตอน "เพิ่มหลักสูตรใหม่" ยังไม่มีแถวใน course_attendees ให้ผูก
 * path ที่ได้จะถูกบันทึกลงคอลัมน์ Certificate ตอนกดบันทึกหลักสูตรตามปกติ
 *
 * คอลัมน์ Certificate เก็บได้ทั้ง URL ภายนอก (เช่น Google Drive ของข้อมูลเดิม)
 * และ path ของไฟล์ที่อัปโหลดเอง หน้าเว็บแยกด้วยการดูว่าขึ้นต้นด้วย http หรือไม่
 */
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

const CERT_DIR      = '../uploads/certificates/';
const CERT_URL_BASE = 'api/uploads/certificates/';
const CERT_MAX_SIZE = 10 * 1024 * 1024;   // 10 MB

// นามสกุลที่ยอมรับ -> MIME ที่ต้องตรงกันจริง
const CERT_ALLOWED = [
    'pdf'  => ['application/pdf'],
    'png'  => ['image/png'],
    'jpg'  => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
];

function fail(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_FILES['file'])) {
    fail("ไม่พบไฟล์ที่อัปโหลด");
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    // ใช้ switch ไม่ใช่ match เพราะ match มีเฉพาะ PHP 8
    // เซิร์ฟเวอร์จริงเป็น PHP 7.4 ถ้าใช้ match จะ parse error ทั้งไฟล์ (500) ตั้งแต่ก่อนโค้ดรัน
    switch ($file['error']) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            $reason = "ไฟล์ใหญ่เกินกว่าที่เซิร์ฟเวอร์รับได้";
            break;
        case UPLOAD_ERR_PARTIAL:
            $reason = "อัปโหลดไม่สมบูรณ์ กรุณาลองใหม่";
            break;
        case UPLOAD_ERR_NO_FILE:
            $reason = "ไม่ได้เลือกไฟล์";
            break;
        default:
            $reason = "อัปโหลดไม่สำเร็จ (รหัส {$file['error']})";
    }
    fail($reason);
}

if ($file['size'] <= 0) {
    fail("ไฟล์ว่างเปล่า");
}
if ($file['size'] > CERT_MAX_SIZE) {
    fail("ไฟล์ใหญ่เกิน 10 MB (ไฟล์นี้ " . round($file['size'] / 1048576, 1) . " MB)");
}

// นามสกุลจากชื่อไฟล์ใช้ตัดสินอย่างเดียวไม่พอ ต้องอ่าน MIME จากเนื้อไฟล์จริงด้วย
// ไม่งั้นเปลี่ยนชื่อ shell.php เป็น shell.pdf ก็ผ่าน
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!isset(CERT_ALLOWED[$ext])) {
    fail("รองรับเฉพาะไฟล์ .pdf .png .jpg เท่านั้น");
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime  = $finfo->file($file['tmp_name']);
if (!in_array($mime, CERT_ALLOWED[$ext], true)) {
    fail("เนื้อไฟล์ไม่ตรงกับนามสกุล (.$ext แต่ตรวจพบ $mime)");
}

// เป็นไฟล์ที่อัปโหลดมาจริง ไม่ใช่ path ที่ถูกยัดมา
if (!is_uploaded_file($file['tmp_name'])) {
    fail("ไฟล์ไม่ถูกต้อง");
}

$dir = __DIR__ . '/' . CERT_DIR;
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    fail("สร้างโฟลเดอร์เก็บไฟล์ไม่สำเร็จ", 500);
}

// กันไม่ให้ไฟล์ในโฟลเดอร์นี้ถูกรันเป็นสคริปต์ เผื่อมีอะไรหลุดการตรวจข้างบน
$htaccess = $dir . '.htaccess';
if (!file_exists($htaccess)) {
    @file_put_contents($htaccess, "php_flag engine off\nOptions -ExecCGI\nAddType text/plain .php .phtml .php5 .php7 .phar\n");
}

// ตั้งชื่อเองทั้งหมด ไม่เอาชื่อจากผู้ใช้มาใช้ (กัน path traversal และชื่อชนกัน)
$newName = 'cert_' . date('Ymd') . '_' . bin2hex(random_bytes(8)) . '.' . $ext;

if (!move_uploaded_file($file['tmp_name'], $dir . $newName)) {
    fail("บันทึกไฟล์ไม่สำเร็จ", 500);
}
@chmod($dir . $newName, 0644);

echo json_encode([
    "success"  => true,
    "message"  => "อัปโหลดเกียรติบัตรสำเร็จ",
    "path"     => CERT_URL_BASE . $newName,          // เก็บลงคอลัมน์ Certificate
    "filename" => basename($file['name']),           // ไว้แสดงให้ผู้ใช้ดูเฉย ๆ
    "size"     => (int)$file['size'],
], JSON_UNESCAPED_UNICODE);
