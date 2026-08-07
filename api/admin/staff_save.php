<?php
require_once '../config.php';
require_once __DIR__ . '/../auth.php';
requireAuth();
require_once __DIR__ . '/user_types_lib.php';

// Change to $_POST because we are sending FormData
$StID = $_POST['StID'] ?? '';
$StName = $_POST['StName'] ?? '';
$SexNo = $_POST['SexNo'] ?? null;
$TitleNo = $_POST['TitleNo'] ?? null;
$StPost = $_POST['StPost'] ?? '';
$DepNo = $_POST['DepNo'] ?? '';
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

// ประเภทผู้ใช้งาน: รับได้ทุกประเภทที่มีในตาราง user_types (ไม่ใช่แค่ admin/staff)
// ensureUserTypeSchema ขยาย users.user_type จาก ENUM เป็น VARCHAR ให้ด้วย ไม่งั้นเก็บประเภทใหม่ไม่ได้
ensureUserTypeSchema($conn);
$user_type = normalizeUserType($conn, $_POST['user_type'] ?? null);

if (!empty($StID) && !empty($StName)) {
    try {
        // Check if StID already exists
        $check = $conn->prepare("SELECT StID FROM staffs WHERE StID = ?");
        $check->execute([$StID]);
        if ($check->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "รหัสเจ้าหน้าที่นี้มีอยู่ในระบบแล้ว"]);
            exit;
        }

        // Check if Username already exists
        $checkUser = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $checkUser->execute([$username]);
        if ($checkUser->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว"]);
            exit;
        }

        $image_url = '';
        // Handle File Upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $fileTmpPath = $_FILES['image']['tmp_name'];
            $fileName = $_FILES['image']['name'];
            $fileSize = $_FILES['image']['size'];
            $fileType = $_FILES['image']['type'];
            $fileNameCmps = explode(".", $fileName);
            $fileExtension = strtolower(end($fileNameCmps));

            $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg', 'webp');
            if (in_array($fileExtension, $allowedfileExtensions)) {
                $uploadFileDir = '../images/';
                if (!is_dir($uploadFileDir)) {
                    mkdir($uploadFileDir, 0777, true);
                }
                $newFileName = 'staff_' . uniqid() . '.' . $fileExtension;
                $dest_path = $uploadFileDir . $newFileName;

                if(move_uploaded_file($fileTmpPath, $dest_path)) {
                    $image_url = 'api/images/' . $newFileName;
                } else {
                    echo json_encode(["success" => false, "message" => "เกิดข้อผิดพลาดในการย้ายไฟล์ที่อัปโหลด"]);
                    exit;
                }
            } else {
                echo json_encode(["success" => false, "message" => "ประเภทไฟล์ไม่รองรับ (รองรับเฉพาะ JPG, PNG, WEBP)"]);
                exit;
            }
        }

        $conn->beginTransaction();

        // Get max sort_order
        $maxOrderStmt = $conn->query("SELECT MAX(sort_order) as max_order FROM staffs");
        $maxOrder = $maxOrderStmt->fetch(PDO::FETCH_ASSOC)['max_order'] ?? 0;
        $nextOrder = $maxOrder + 1;

        $query = "INSERT INTO staffs (StID, StName, SexNo, TitleNo, StPost, DepNo, image, sort_order) 
                  VALUES (:StID, :StName, :SexNo, :TitleNo, :StPost, :DepNo, :image, :sort_order)";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(":StID", $StID);
        $stmt->bindParam(":StName", $StName);
        $stmt->bindParam(":SexNo", $SexNo);
        $stmt->bindParam(":TitleNo", $TitleNo);
        $stmt->bindParam(":StPost", $StPost);
        $stmt->bindParam(":DepNo", $DepNo);
        $stmt->bindParam(":image", $image_url);
        $stmt->bindParam(":sort_order", $nextOrder);
        $stmt->execute();

        // Create User Account
        $user_query = "INSERT INTO users (username, password, fullname, user_type, StID)
                       VALUES (:username, :password, :fullname, :user_type, :StID)";
        $hashedPassword = hashPassword($password);
        $user_stmt = $conn->prepare($user_query);
        $user_stmt->bindParam(":username", $username);
        $user_stmt->bindParam(":password", $hashedPassword);
        $user_stmt->bindParam(":fullname", $StName);
        $user_stmt->bindParam(":user_type", $user_type);
        $user_stmt->bindParam(":StID", $StID);
        $user_stmt->execute();

        $conn->commit();
        echo json_encode(["success" => true, "message" => "เพิ่มข้อมูลและสร้างบัญชีผู้ใช้งานสำเร็จ"]);

    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "ข้อมูลไม่ครบถ้วน"]);
}
?>
