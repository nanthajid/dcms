<?php
require_once '../config.php';

try {
    $query = "SELECT 
                s.StID, 
                s.StName, 
                s.image,
                s.TitleNo,
                s.SexNo,
                s.StPost,
                s.DepNo,
                s.sort_order,
                p.PostType,
                pt.PostTypeName,
                t.Title,
                sx.SexName,
                p.StPostName,
                d.DepName,
                u.username,
                -- ห้าม SELECT u.password ออกมาเด็ดขาด: endpoint นี้เรียกได้โดยไม่ต้องล็อกอิน
                -- และหน้าแก้ไขก็ล้างช่องรหัสผ่านทิ้งอยู่แล้ว (StaffManagement.tsx handleEditClick)
                u.user_type
              FROM staffs s
              LEFT JOIN titles t ON s.TitleNo = t.TitleNo
              LEFT JOIN sex sx ON s.SexNo = sx.SexNo
              LEFT JOIN positions p ON s.StPost = p.StPost
              LEFT JOIN post_type pt ON p.PostType = pt.PostType
              LEFT JOIN departments d ON s.DepNo = d.DepNo
              LEFT JOIN users u ON s.StID = u.StID
              ORDER BY s.sort_order ASC, s.StID ASC";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $staffs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "data" => $staffs
    ]);

} catch(PDOException $exception) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "message" => "Error: " . $exception->getMessage()
    ]);
}
?>
