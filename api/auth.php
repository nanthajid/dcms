<?php
/**
 * ตรวจสิทธิ์การเข้าถึง API หลังบ้าน
 *
 * เดิม login.php สุ่ม token ส่งให้หน้าเว็บเก็บใน localStorage แต่ไม่ได้เก็บฝั่งเซิร์ฟเวอร์
 * = ตรวจอะไรไม่ได้เลย ทุก endpoint ใน api/admin/ จึงเรียกได้จากภายนอกโดยไม่ต้องล็อกอิน
 * เปลี่ยนมาใช้ PHP session ซึ่งเบราว์เซอร์ส่ง cookie ให้เองเพราะเป็น origin เดียวกัน
 *
 * วิธีใช้ในไฟล์ endpoint (ต่อจาก require config.php):
 *     require_once __DIR__ . '/../auth.php';
 *     requireAuth();
 */

if (!function_exists('startAppSession')) {

    function startAppSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) return;

        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

        session_set_cookie_params([
            'lifetime' => 0,          // หมดอายุเมื่อปิดเบราว์เซอร์
            'path'     => '/',
            'httponly' => true,       // JS อ่านไม่ได้ = ขโมยผ่าน XSS ยากขึ้น
            'secure'   => $https,     // บน https ห้ามส่ง cookie ข้าม http
            'samesite' => 'Lax',      // กันเว็บอื่นยิงคำสั่งแทนผู้ใช้ (CSRF)
        ]);
        session_name('DCMS_SESSID');
        session_start();
    }

    /** ข้อมูลผู้ใช้ที่ล็อกอินอยู่ หรือ null ถ้ายังไม่ได้ล็อกอิน */
    function currentUser(): ?array
    {
        startAppSession();
        return $_SESSION['user'] ?? null;
    }

    /** บันทึกผู้ใช้ลง session หลังตรวจรหัสผ่านผ่านแล้ว */
    function loginUser(array $user): void
    {
        startAppSession();
        // กัน session fixation: ผู้โจมตีที่ยัด session id ไว้ก่อน จะใช้ id เดิมต่อไม่ได้
        session_regenerate_id(true);
        $_SESSION['user'] = $user;
        $_SESSION['login_at'] = time();
    }

    function logoutUser(): void
    {
        startAppSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }

    /**
     * ต้องล็อกอินก่อนถึงจะเรียก endpoint นี้ได้ ไม่งั้นตอบ 401 แล้วจบ
     * หน้าเว็บดัก 401 แล้วเด้งไปหน้า login ให้เอง
     */
    function requireAuth(): array
    {
        $user = currentUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "กรุณาเข้าสู่ระบบก่อนใช้งาน",
                "code"    => "UNAUTHENTICATED"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        return $user;
    }

    /** เฉพาะ user_type = admin (superuser) เท่านั้น */
    function requireSuperuser(): array
    {
        $user = requireAuth();
        if (($user['user_type'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "ต้องเป็นผู้ดูแลระบบเท่านั้นจึงจะใช้คำสั่งนี้ได้",
                "code"    => "FORBIDDEN"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        return $user;
    }

    /**
     * เข้ารหัสรหัสผ่านก่อนเก็บลงฐานข้อมูล — ทุกที่ที่เขียนคอลัมน์ users.password
     * ต้องผ่านฟังก์ชันนี้ ห้ามเก็บข้อความตรง ๆ
     */
    function hashPassword(string $plain): string
    {
        return password_hash($plain, PASSWORD_DEFAULT);
    }

    /**
     * ค่าที่เก็บอยู่เป็น hash แล้วหรือยัง
     * ใช้แยกข้อมูลเก่าที่ยังเป็น plaintext ตอน migrate และตอนล็อกอิน
     */
    function looksHashed(?string $stored): bool
    {
        if ($stored === null || $stored === '') return false;

        // ค่า algo ต่างกันตามเวอร์ชัน PHP:
        //   PHP 8   คืนสตริง ('2y', 'argon2i') และ null เมื่อไม่ใช่ hash
        //   PHP 7.4 คืน int  (1, 2, 3)         และ 0    เมื่อไม่ใช่ hash
        // ถ้าเช็คแค่ !== null บน PHP 7.4 จะตัดสินว่ารหัสผ่าน plaintext เป็น hash
        // แล้ว login.php จะไปเรียก password_verify กับข้อความธรรมดา = ล็อกอินไม่ได้เลย
        $algo = password_get_info($stored)['algo'] ?? null;
        if (!empty($algo)) return true;

        // เผื่อ password_get_info ไม่รู้จักรูปแบบ แต่หน้าตาเป็น hash ที่ PHP รองรับ
        return (bool) preg_match('/^\$(2[aby]|argon2(id|i|d))\$/', $stored);
    }

    /**
     * ตรวจสิทธิ์ระดับเมนู/ปุ่มตามที่ตั้งไว้ในหน้าจัดการ user_type
     * ใช้กับ endpoint ที่อยากบังคับฝั่งเซิร์ฟเวอร์ด้วย ไม่ใช่ซ่อนแค่ปุ่มบนหน้าจอ
     */
    function requirePermission(PDO $conn, string $key): array
    {
        $user = requireAuth();
        if (($user['user_type'] ?? '') === 'admin') return $user;

        require_once __DIR__ . '/admin/user_types_lib.php';
        $permissions = getMenuPermissions($conn);
        $allowed = $permissions[$user['user_type'] ?? ''] ?? [];

        if (!in_array($key, $allowed, true)) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "คุณไม่มีสิทธิ์ใช้คำสั่งนี้",
                "code"    => "FORBIDDEN"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        return $user;
    }
}
