<?php
require_once 'config.php';

try {
    $query = "SELECT id, fullname, specialty, education_background, bio, image_url, rating FROM counselors WHERE is_active = 1";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $counselors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($counselors);
} catch(PDOException $exception) {
    http_response_code(500);
    echo json_encode(["message" => "Error fetching data: " . $exception->getMessage()]);
}
?>
