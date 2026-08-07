<?php
/**
 * สร้างบัญชีผู้ดูแลระบบตัวแรก — ใช้ตอนติดตั้งระบบใหม่เท่านั้น
 *
 * ของเดิมเรียกได้จากภายนอกตลอดเวลา และ echo รหัสผ่าน admin ออกหน้าจอ
 * = ใครก็ตามที่รู้ URL นี้ได้บัญชีผู้ดูแลไปเลย ทำให้การตรวจสิทธิ์ที่อื่นไร้ความหมาย
 *
 * ตอนนี้จะทำงานก็ต่อเมื่อตาราง users ยังว่างเปล่าจริง ๆ (ยังไม่มีใครในระบบ)
 * และไม่แสดงรหัสผ่านออกมาอีก — ผู้ติดตั้งต้องกำหนดรหัสผ่านเองผ่านตัวแปรด้านล่าง
 */
require_once 'config.php';

header('Content-Type: text/html; charset=UTF-8');

try {
    $userCount = (int)$conn->query("SELECT COUNT(*) FROM users")->fetchColumn();

    if ($userCount > 0) {
        http_response_code(403);
        echo "<h3>ระบบมีผู้ใช้งานอยู่แล้ว</h3>";
        echo "<p>สคริปต์นี้ใช้ได้เฉพาะตอนติดตั้งครั้งแรกที่ยังไม่มีผู้ใช้ในระบบ</p>";
        echo "<p>ถ้าลืมรหัสผ่านผู้ดูแล ให้แก้ในฐานข้อมูลโดยตรง ไม่ใช่ผ่านหน้านี้</p>";
        exit;
    }

    // ต้องแก้ค่านี้ก่อนใช้งาน — จงใจไม่ตั้งค่าเริ่มต้นให้ เพื่อไม่ให้มีรหัสผ่านที่เดาได้
    $username = 'admin';
    $fullname = 'ผู้ดูแลระบบสูงสุด';
    $password = '';   // <-- ใส่รหัสผ่านที่ต้องการตรงนี้ก่อนเปิดหน้านี้

    if ($password === '') {
        http_response_code(400);
        echo "<h3>ยังไม่ได้ตั้งรหัสผ่าน</h3>";
        echo "<p>เปิดไฟล์ <code>api/setup_admin.php</code> แล้วกำหนดค่าตัวแปร <code>\$password</code> ก่อน</p>";
        exit;
    }

    $stmt = $conn->prepare(
        "INSERT INTO users (username, password, fullname, user_type) VALUES (?, ?, ?, 'admin')"
    );
    // เก็บเป็น hash ตั้งแต่ต้น login.php รองรับ password_verify อยู่แล้ว
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $fullname]);

    echo "<h3>สร้างบัญชีผู้ดูแลระบบสำเร็จ</h3>";
    echo "<p>Username: <b>" . htmlspecialchars($username, ENT_QUOTES, 'UTF-8') . "</b></p>";
    echo "<p>รหัสผ่าน: ตามที่กำหนดไว้ในไฟล์ (ไม่แสดงบนหน้าเว็บ)</p>";
    echo "<p><b>ลบไฟล์นี้ออกจากเซิร์ฟเวอร์ทันทีหลังใช้งานเสร็จ</b></p>";

} catch (PDOException $e) {
    http_response_code(500);
    echo "<h3>เกิดข้อผิดพลาด</h3>";
    echo "<p>กรุณาตรวจสอบว่า import ไฟล์ database.sql และมีตาราง users แล้วหรือยัง</p>";
}
