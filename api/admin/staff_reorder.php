<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$StID = $data['StID'] ?? '';
$direction = $data['direction'] ?? ''; // 'up' or 'down'
$DepNo = $data['DepNo'] ?? 'ALL';

if (!$StID || !$direction) {
    echo json_encode(["success" => false, "message" => "Missing parameters"]);
    exit;
}

try {
    $conn->beginTransaction();

    // Get current staff sort_order
    $stmt = $conn->prepare("SELECT sort_order FROM staffs WHERE StID = ?");
    $stmt->execute([$StID]);
    $current = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$current) {
        throw new Exception("Staff not found");
    }

    $currentOrder = $current['sort_order'];

    $whereClause = "";
    if ($DepNo !== 'ALL') {
        $whereClause = " AND DepNo = :DepNo";
    }

    if ($direction === 'up') {
        // Find the one above (smaller sort_order, but the largest of those)
        $stmt = $conn->prepare("SELECT StID, sort_order FROM staffs WHERE sort_order < :currentOrder $whereClause ORDER BY sort_order DESC LIMIT 1");
    } else {
        // Find the one below (larger sort_order, but the smallest of those)
        $stmt = $conn->prepare("SELECT StID, sort_order FROM staffs WHERE sort_order > :currentOrder $whereClause ORDER BY sort_order ASC LIMIT 1");
    }

    $stmt->bindParam(":currentOrder", $currentOrder);
    if ($DepNo !== 'ALL') {
        $stmt->bindParam(":DepNo", $DepNo);
    }
    $stmt->execute();

    $target = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($target) {
        $targetID = $target['StID'];
        $targetOrder = $target['sort_order'];

        // Swap
        $update1 = $conn->prepare("UPDATE staffs SET sort_order = ? WHERE StID = ?");
        $update1->execute([$targetOrder, $StID]);

        $update2 = $conn->prepare("UPDATE staffs SET sort_order = ? WHERE StID = ?");
        $update2->execute([$currentOrder, $targetID]);

        $conn->commit();
        echo json_encode(["success" => true, "message" => "Reordered successfully"]);
    } else {
        $conn->rollBack();
        echo json_encode(["success" => false, "message" => "Already at the limit"]);
    }

} catch(Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
