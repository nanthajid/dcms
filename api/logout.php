<?php
/**
 * ออกจากระบบ — ทำลาย session ฝั่งเซิร์ฟเวอร์
 *
 * หน้าเว็บลบ localStorage เองอยู่แล้ว แต่ถ้าไม่ล้าง session ด้วย
 * cookie เดิมยังใช้เรียก api/admin/ ได้ต่อ = ออกจากระบบไม่จริง
 */
require_once 'config.php';
require_once 'auth.php';

logoutUser();

echo json_encode([
    "success" => true,
    "message" => "ออกจากระบบเรียบร้อย"
], JSON_UNESCAPED_UNICODE);
