<?php
require_once '../config.php';

// Check if user is logged in and is admin/staff
// In a real app, you'd verify the token here.
// For now, we assume the frontend sends the request only if authorized.

try {
    // 1. Total Counselors
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM counselors WHERE is_active = 1");
    $stmt->execute();
    $counselors_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // 2. Appointments Stats
    $today = date('Y-m-d');
    
    // Today's appointments
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = :today");
    $stmt->bindParam(":today", $today);
    $stmt->execute();
    $appointments_today = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Completed appointments
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'");
    $stmt->execute();
    $appointments_completed = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Pending appointments
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'");
    $stmt->execute();
    $appointments_pending = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // 3. Staff Stats
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM staffs");
    $stmt->execute();
    $staff_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // 4. WFH Today
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM wfh_records WHERE start_date = :today AND status = 'approved'");
    $stmt->bindParam(":today", $today);
    $stmt->execute();
    $wfh_today = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // 5. Leave Today
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM staff_leaves WHERE :today BETWEEN start_date AND end_date AND status = 'approved'");
    $stmt->bindParam(":today", $today);
    $stmt->execute();
    $leave_today = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    echo json_encode([
        "success" => true,
        "data" => [
            "counselors_total" => $counselors_count,
            "appointments_today" => $appointments_today,
            "appointments_completed" => $appointments_completed,
            "appointments_pending" => $appointments_pending,
            "staff_total" => $staff_count,
            "wfh_today" => $wfh_today,
            "leave_today" => $leave_today
        ]
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>
