<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

try {
    $stmt = $conn->prepare("SELECT id, name, color FROM leave_types ORDER BY id ASC");
    $stmt->execute();
    $types = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["success" => true, "data" => $types]);
} catch(PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
