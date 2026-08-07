<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

try {
    $query = "SELECT * FROM counselors ORDER BY id DESC";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $counselors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($counselors);
} catch(PDOException $exception) {
    http_response_code(500);
    echo json_encode(["message" => "Error: " . $exception->getMessage()]);
}
?>
