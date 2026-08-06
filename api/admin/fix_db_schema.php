<?php
require_once '../config.php';

try {
    // Increase lengths for IDs and master data codes
    $conn->exec("ALTER TABLE staffs MODIFY COLUMN StID VARCHAR(50)");
    $conn->exec("ALTER TABLE staffs MODIFY COLUMN StPost VARCHAR(255)");
    $conn->exec("ALTER TABLE staffs MODIFY COLUMN DepNo VARCHAR(50)");
    $conn->exec("ALTER TABLE staffs MODIFY COLUMN TitleNo VARCHAR(10)");
    $conn->exec("ALTER TABLE staffs MODIFY COLUMN SexNo VARCHAR(10)");
    
    $conn->exec("ALTER TABLE users MODIFY COLUMN StID VARCHAR(50)");
    $conn->exec("ALTER TABLE wfh_records MODIFY COLUMN StID VARCHAR(50)");
    
    $conn->exec("ALTER TABLE departments MODIFY COLUMN DepNo VARCHAR(50)");
    $conn->exec("ALTER TABLE positions MODIFY COLUMN StPost VARCHAR(255)");
    $conn->exec("ALTER TABLE positions MODIFY COLUMN PostType VARCHAR(50)");
    $conn->exec("ALTER TABLE post_type MODIFY COLUMN PostType VARCHAR(50)");

    echo json_encode(["success" => true, "message" => "Database schema updated successfully (Expanded StID and other fields)."]);
} catch(PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
