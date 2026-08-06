<?php
require_once '../config.php';

try {
    // 1. Add column StID and update user_type enum
    $conn->exec("ALTER TABLE users MODIFY COLUMN user_type ENUM('student', 'admin', 'staff') DEFAULT 'student'");
    
    // Check if StID column exists
    $checkColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'StID'");
    if ($checkColumn->rowCount() == 0) {
        $conn->exec("ALTER TABLE users ADD COLUMN StID VARCHAR(15) DEFAULT NULL AFTER user_type");
        $conn->exec("ALTER TABLE users ADD INDEX (StID)");
        echo "Added StID column to users table.<br>";
    }

    // 2. Sync existing staffs to users table
    $staffs = $conn->query("SELECT StID, StName FROM staffs")->fetchAll(PDO::FETCH_ASSOC);
    $count = 0;
    
    foreach ($staffs as $staff) {
        $stid = $staff['StID'];
        $name = $staff['StName'];
        
        // Check if user already exists
        $check = $conn->prepare("SELECT id FROM users WHERE StID = ? OR username = ?");
        $check->execute([$stid, $stid]);
        
        if ($check->rowCount() == 0) {
            $stmt = $conn->prepare("INSERT INTO users (username, password, fullname, user_type, StID) VALUES (?, ?, ?, 'staff', ?)");
            $stmt->execute([$stid, $stid, $name, $stid]);
            $count++;
        }
    }
    
    echo "Migration completed. Created $count user accounts for existing staff.";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
