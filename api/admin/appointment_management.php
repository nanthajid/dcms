<?php
require_once '../config.php';

$action = isset($_GET['action']) ? $_GET['action'] : 'list';

try {
    switch ($action) {
        case 'list':
            $query = "SELECT a.*, u.fullname as user_name, u.phone as user_phone, c.fullname as counselor_name 
                      FROM appointments a 
                      LEFT JOIN users u ON a.user_id = u.id 
                      LEFT JOIN counselors c ON a.counselor_id = c.id 
                      ORDER BY a.appointment_date DESC, a.appointment_time DESC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "data" => $data]);
            break;

        case 'update_status':
            $data = json_decode(file_get_contents("php://input"));
            if (!empty($data->id) && !empty($data->status)) {
                $query = "UPDATE appointments SET status = :status WHERE id = :id";
                $stmt = $conn->prepare($query);
                $stmt->bindParam(":status", $data->status);
                $stmt->bindParam(":id", $data->id);
                if ($stmt->execute()) {
                    echo json_encode(["success" => true, "message" => "อัปเดตสถานะสำเร็จ"]);
                } else {
                    echo json_encode(["success" => false, "message" => "ไม่สามารถอัปเดตสถานะได้"]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
            }
            break;

        case 'delete':
            $data = json_decode(file_get_contents("php://input"));
            if (!empty($data->id)) {
                $query = "DELETE FROM appointments WHERE id = :id";
                $stmt = $conn->prepare($query);
                $stmt->bindParam(":id", $data->id);
                if ($stmt->execute()) {
                    echo json_encode(["success" => true, "message" => "ลบข้อมูลสำเร็จ"]);
                } else {
                    echo json_encode(["success" => false, "message" => "ไม่สามารถลบข้อมูลได้"]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
            }
            break;

        default:
            echo json_encode(["success" => false, "message" => "Action not found"]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
