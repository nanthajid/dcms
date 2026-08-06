<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
require_once 'api/config.php';

// Add
$stmt = $conn->prepare("INSERT INTO positions (StPost, StPostName) VALUES ('P99', 'Test')");
$stmt->execute();

// Delete via simulated API logic
$json = json_encode(["StPost" => "P99"]);
$data = json_decode($json);

if (!empty($data->StPost)) {
    try {
        $check_staff = $conn->prepare("SELECT StID FROM staffs WHERE StPost = ? LIMIT 1");
        $check_staff->execute([$data->StPost]);
        if ($check_staff->rowCount() > 0) {
            echo "Staff exists\n";
        } else {
            $stmt = $conn->prepare("DELETE FROM positions WHERE StPost = ?");
            if ($stmt->execute([$data->StPost])) {
                echo "Deleted successfully\n";
            } else {
                echo "Failed to delete\n";
            }
        }
    } catch(PDOException $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
?>