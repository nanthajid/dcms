<?php
require_once 'api/config.php';

try {
    $conn->beginTransaction();

    // 1. Delete duplicates keeping the one with the largest ID
    $deleteSql = "DELETE t1 FROM outside_work_records t1
                  INNER JOIN outside_work_records t2 
                  WHERE t1.id < t2.id 
                  AND t1.StID = t2.StID 
                  AND t1.work_date = t2.work_date";
    $deleted = $conn->exec($deleteSql);
    echo "Deleted $deleted duplicate records.\n";

    // 2. Add Unique constraint
    // First, check if the constraint already exists to avoid errors
    $checkIndex = $conn->query("SHOW INDEX FROM outside_work_records WHERE Key_name = 'unique_staff_date'");
    if ($checkIndex->rowCount() == 0) {
        $conn->exec("ALTER TABLE outside_work_records ADD UNIQUE KEY unique_staff_date (StID, work_date)");
        echo "Added UNIQUE KEY unique_staff_date (StID, work_date).\n";
    } else {
        echo "UNIQUE KEY already exists.\n";
    }

    $conn->commit();
    echo "Database cleaned and constraints updated successfully.";
} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo "Error: " . $e->getMessage();
}
?>