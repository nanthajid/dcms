<?php
require_once '../config.php';

try {
    $titles = $conn->query("SELECT TitleNo, Title FROM titles")->fetchAll(PDO::FETCH_ASSOC);
    $sex = $conn->query("SELECT SexNo, SexName FROM sex")->fetchAll(PDO::FETCH_ASSOC);
    $departments = $conn->query("SELECT DepNo, DepName FROM departments")->fetchAll(PDO::FETCH_ASSOC);
    $positions = $conn->query("SELECT p.StPost, p.StPostName, p.PostType, pt.PostTypeName 
                               FROM positions p 
                               LEFT JOIN post_type pt ON p.PostType = pt.PostType")->fetchAll(PDO::FETCH_ASSOC);
    $post_types = $conn->query("SELECT PostType, PostTypeName FROM post_type")->fetchAll(PDO::FETCH_ASSOC);

    // Generate Next StID (Running Number STxxx)
    $stmt = $conn->query("SELECT StID FROM staffs WHERE StID LIKE 'ST%' ORDER BY StID DESC LIMIT 1");
    $lastStID = $stmt->fetchColumn();
    $nextStID = "ST001";
    if ($lastStID) {
        $lastNum = (int)substr($lastStID, 2);
        $nextStID = "ST" . sprintf("%03d", $lastNum + 1);
    }

    // Generate Next StPost (Running Number Pxx)
    $stmt = $conn->query("SELECT StPost FROM positions WHERE StPost LIKE 'P%' ORDER BY StPost DESC LIMIT 1");
    $lastStPost = $stmt->fetchColumn();
    $nextStPost = "P01";
    if ($lastStPost) {
        $lastNum = (int)substr($lastStPost, 1);
        $nextStPost = "P" . sprintf("%02d", $lastNum + 1);
    }

    // Generate Next PostType (Running Number Txx)
    $stmt = $conn->query("SELECT PostType FROM post_type WHERE PostType LIKE 'T%' ORDER BY PostType DESC LIMIT 1");
    $lastPostType = $stmt->fetchColumn();
    $nextPostType = "T01";
    if ($lastPostType) {
        $lastNum = (int)substr($lastPostType, 1);
        $nextPostType = "T" . sprintf("%02d", $lastNum + 1);
    }

    echo json_encode([
        "success" => true,
        "options" => [
            "titles" => $titles,
            "sex" => $sex,
            "departments" => $departments,
            "positions" => $positions,
            "post_types" => $post_types,
            "nextStID" => $nextStID,
            "nextStPost" => $nextStPost,
            "nextPostType" => $nextPostType
        ]
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
