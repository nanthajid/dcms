<?php
require_once 'config.php';

try {
    // 1. ตรวจสอบว่ามี user admin อยู่แล้วหรือไม่
    $check_query = "SELECT id FROM users WHERE username = 'admin'";
    $check_stmt = $conn->prepare($check_query);
    $check_stmt->execute();

    if ($check_stmt->rowCount() > 0) {
        echo "<h3>ข้อมูล Admin มีอยู่ในระบบเรียบร้อยแล้ว!</h3>";
        echo "<p>คุณสามารถใช้ Username: <b>admin</b> และ Password: <b>admin1234</b> ในการ Login ได้ทันที</p>";
    } else {
        // 2. ถ้ายังไม่มี ให้ทำการ Insert เข้าไป
        $username = "admin";
        $password = "admin1234"; // ในอนาคตแนะนำให้ใช้ password_hash("admin1234", PASSWORD_DEFAULT)
        $fullname = "ผู้ดูแลระบบสูงสุด";
        $user_type = "admin";

        $insert_query = "INSERT INTO users (username, password, fullname, user_type) VALUES (:username, :password, :fullname, :user_type)";
        $insert_stmt = $conn->prepare($insert_query);
        $insert_stmt->bindParam(":username", $username);
        $insert_stmt->bindParam(":password", $password);
        $insert_stmt->bindParam(":fullname", $fullname);
        $insert_stmt->bindParam(":user_type", $user_type);
        
        if ($insert_stmt->execute()) {
            echo "<h3>สร้าง User Admin สำเร็จ!</h3>";
            echo "<p>------------------------------------</p>";
            echo "<p><b>ข้อมูลเข้าสู่ระบบ:</b></p>";
            echo "<p>Username: <span style='color: blue;'>admin</span></p>";
            echo "<p>Password: <span style='color: blue;'>admin1234</span></p>";
            echo "<p>------------------------------------</p>";
            echo "<p><a href='http://localhost:5174/admin/login'>ไปที่หน้า Login</a></p>";
        } else {
            echo "<h3>เกิดข้อผิดพลาดในการสร้าง User</h3>";
        }
    }
} catch (PDOException $e) {
    echo "<h3>Error: " . $e->getMessage() . "</h3>";
    echo "<p>กรุณาตรวจสอบว่าคุณได้ Import ไฟล์ database.sql หรือยัง และตาราง users ถูกสร้างขึ้นหรือยัง</p>";
}
?>
