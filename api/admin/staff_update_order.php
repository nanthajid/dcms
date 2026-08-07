<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$orderedIds = $data['orderedIds'] ?? [];

if (empty($orderedIds)) {
    echo json_encode(["success" => false, "message" => "Missing parameters"]);
    exit;
}

try {
    $conn->beginTransaction();

    foreach ($orderedIds as $index => $id) {
        $sortOrder = $index + 1;
        $stmt = $conn->prepare("UPDATE staffs SET sort_order = ? WHERE StID = ?");
        $stmt->execute([$sortOrder, $id]);
    }

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Order updated successfully"]);

} catch(Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
