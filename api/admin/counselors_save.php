<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();

// Handle multipart/form-data
$fullname = $_POST['fullname'] ?? '';
$specialty = $_POST['specialty'] ?? '';
$education_background = $_POST['education_background'] ?? '';
$bio = $_POST['bio'] ?? '';
$is_active = $_POST['is_active'] ?? 1;
$id = $_POST['id'] ?? null;
$image_url = $_POST['image_url'] ?? '';

if (!empty($fullname) && !empty($specialty)) {
    try {
        // Handle File Upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = '../images/';
            if (!file_exists($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }

            $file_extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
            $new_filename = uniqid('counselor_', true) . '.' . $file_extension;
            $target_file = $upload_dir . $new_filename;

            if (move_uploaded_file($_FILES['image']['tmp_name'], $target_file)) {
                // Update image_url to the relative path
                $image_url = 'api/images/' . $new_filename;
            }
        }

        if (!empty($id)) {
            // Update
            $query = "UPDATE counselors SET 
                        fullname = :fullname, 
                        specialty = :specialty, 
                        education_background = :education_background,
                        bio = :bio, 
                        image_url = :image_url,
                        is_active = :is_active
                      WHERE id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
        } else {
            // Insert
            $query = "INSERT INTO counselors SET 
                        fullname = :fullname, 
                        specialty = :specialty, 
                        education_background = :education_background,
                        bio = :bio, 
                        image_url = :image_url,
                        is_active = :is_active";
            $stmt = $conn->prepare($query);
        }

        $stmt->bindParam(':fullname', $fullname);
        $stmt->bindParam(':specialty', $specialty);
        $stmt->bindParam(':education_background', $education_background);
        $stmt->bindParam(':bio', $bio);
        $stmt->bindParam(':image_url', $image_url);
        $stmt->bindParam(':is_active', $is_active);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "บันทึกข้อมูลสำเร็จ", "image_url" => $image_url]);
        } else {
            echo json_encode(["success" => false, "message" => "ไม่สามารถบันทึกข้อมูลได้"]);
        }
    } catch(PDOException $exception) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $exception->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "กรุณากรอกข้อมูลให้ครบถ้วน"]);
}
?>
