<?php
require_once 'api/config.php';
$stmt = $conn->query("SHOW CREATE TABLE outside_work_records");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo $row['Create Table'];
echo "\n\n";
$stmt2 = $conn->query("SELECT StID, work_date, COUNT(*) as c FROM outside_work_records GROUP BY StID, work_date HAVING c > 1");
$dups = $stmt2->fetchAll(PDO::FETCH_ASSOC);
echo "Duplicates in table:\n";
print_r($dups);
?>