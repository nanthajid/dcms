<?php
/**
 * CORS + header พื้นฐานของ API
 *
 * แยกออกมาจาก config.php เพราะ config.php เก็บรหัสผ่านฐานข้อมูลของแต่ละเครื่อง
 * จึงส่งขึ้นเซิร์ฟเวอร์ไม่ได้ ไฟล์นี้ไม่มีความลับ อัปเดตทับได้ตลอด
 *
 * เดิม config.php สะท้อน Origin ที่ส่งมาคืนไปทุกค่า คู่กับ Allow-Credentials: true
 * = เว็บไหนก็ได้ยิง API แทนผู้ใช้ที่ล็อกอินอยู่แล้วอ่านคำตอบได้
 * ต้องจำกัดเป็นรายชื่อ ไม่งั้น session ที่เพิ่งเพิ่มก็ถูกยืมไปใช้ได้อยู่ดี
 */

$ALLOWED_ORIGINS = [
    'https://doe-ar2.com',
    'http://localhost:5173',   // vite dev server
    'http://localhost',        // laragon
];

if (isset($_SERVER['HTTP_ORIGIN'])) {
    if (in_array($_SERVER['HTTP_ORIGIN'], $ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    }
    // origin นอกรายชื่อ: ไม่ส่ง header ให้เลย เบราว์เซอร์จะบล็อกคำตอบเอง
    // (คำขอจากหน้าเว็บตัวเองเป็น same-origin ไม่ต้องใช้ header ชุดนี้อยู่แล้ว)
}

// preflight
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");
