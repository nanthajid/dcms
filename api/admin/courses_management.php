<?php
/**
 * จัดการการฝึกอบรม
 *
 * courses          = หัวหลักสูตร 1 เรื่อง (หนังสือเชิญ 1 ฉบับ)
 * course_attendees = เจ้าหน้าที่ที่เข้าอบรมในหลักสูตรนั้น
 *
 * สถานที่: เก็บที่หัวหลักสูตร (TrPlace) เป็นค่าหลัก ส่วนของผู้เข้าอบรมจะเก็บก็ต่อเมื่อ
 * ต่างจากค่าหลัก (NULL = ใช้ตามหลักสูตร) เพราะข้อมูลจริงมีกรณีหลักสูตรเดียวกัน
 * แต่แบ่งคนไปคนละสถานที่ ถ้าบังคับให้เท่ากันหมดจะเก็บของจริงไม่ได้
 */
require_once '../config.php';

$action = $_GET['action'] ?? '';

/** ค่าว่างจากฟอร์มให้เป็น NULL ไม่ใช่ '' เพื่อให้คอลัมน์วันที่/สถานที่เทียบค่าได้ตรง */
function nn($v)
{
    $v = is_string($v) ? trim($v) : $v;
    return ($v === '' || $v === null) ? null : $v;
}

try {
    if ($action === 'list') {
        // ดึงหลักสูตรพร้อมผู้เข้าอบรมในคิวรีเดียว แล้วค่อยจับกลุ่มใน PHP
        // (แยกยิงทีละหลักสูตรจะกลายเป็น N+1 query)
        $courses = $conn->query(
            "SELECT * FROM courses ORDER BY TrDateFrom DESC, id DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $rows = $conn->query(
            "SELECT a.id, a.course_id, a.StID, a.TrPlace, a.Certificate,
                    s.StName, t.Title, d.DepName
             FROM course_attendees a
             LEFT JOIN staffs s ON a.StID = s.StID
             LEFT JOIN titles t ON s.TitleNo = t.TitleNo
             LEFT JOIN departments d ON s.DepNo = d.DepNo
             ORDER BY a.id ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $byCourse = [];
        foreach ($rows as $r) {
            $cid = $r['course_id'];
            unset($r['course_id']);
            $byCourse[$cid][] = $r;
        }

        foreach ($courses as &$c) {
            $c['attendees'] = $byCourse[$c['id']] ?? [];
        }
        unset($c);

        echo json_encode(["success" => true, "data" => $courses], JSON_UNESCAPED_UNICODE);
    }

    elseif ($action === 'options') {
        // รายชื่อเจ้าหน้าที่สำหรับ dropdown เลือกผู้เข้าอบรม
        $staffs = $conn->query(
            "SELECT s.StID, s.StName, t.Title, d.DepName
             FROM staffs s
             LEFT JOIN titles t ON s.TitleNo = t.TitleNo
             LEFT JOIN departments d ON s.DepNo = d.DepNo
             ORDER BY s.sort_order ASC, s.StID ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        // หน่วยงาน/สถานที่ที่เคยกรอก ใช้เป็น datalist ช่วยกรอกซ้ำให้ตรงกัน
        $orgs = $conn->query(
            "SELECT DISTINCT TrOrganization FROM courses
             WHERE TrOrganization IS NOT NULL AND TrOrganization <> ''
             ORDER BY TrOrganization"
        )->fetchAll(PDO::FETCH_COLUMN);

        $places = $conn->query(
            "SELECT DISTINCT TrPlace FROM courses
             WHERE TrPlace IS NOT NULL AND TrPlace <> ''
             ORDER BY TrPlace"
        )->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            "success" => true,
            "options" => [
                "staffs"        => $staffs,
                "organizations" => $orgs,
                "places"        => $places,
                "urgents"       => ['ปกติ', 'ด่วน', 'ด่วนที่สุด'],
            ]
        ], JSON_UNESCAPED_UNICODE);
    }

    elseif ($action === 'save') {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['CourseName']) || trim($data['CourseName']) === '') {
            echo json_encode(["success" => false, "message" => "กรุณากรอกชื่อหลักสูตร"]);
            exit;
        }
        if (empty($data['attendees']) || !is_array($data['attendees'])) {
            echo json_encode(["success" => false, "message" => "กรุณาเลือกผู้เข้าอบรมอย่างน้อย 1 คน"]);
            exit;
        }

        $from = nn($data['TrDateFrom'] ?? null);
        $to   = nn($data['TrDateTo'] ?? null);
        if ($from && $to && $to < $from) {
            echo json_encode(["success" => false, "message" => "วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่ม"]);
            exit;
        }

        $mainPlace = nn($data['TrPlace'] ?? null);
        $id = $data['id'] ?? null;

        // หัวหลักสูตรกับผู้เข้าอบรมต้องสำเร็จหรือล้มพร้อมกัน
        // ไม่งั้นจะเหลือหลักสูตรที่ไม่มีคนเข้าอบรมค้างอยู่
        $conn->beginTransaction();

        $fields = [
            nn($data['AddID'] ?? '') ?? '',
            nn($data['RDate'] ?? null),
            nn($data['Rtime'] ?? null),
            nn($data['Urgent'] ?? null) ?? 'ปกติ',
            trim($data['CourseName']),
            $from,
            $to,
            nn($data['TrOrganization'] ?? null),
            $mainPlace,
            nn($data['Detail'] ?? null),
        ];

        if ($id) {
            $stmt = $conn->prepare(
                "UPDATE courses SET AddID=?, RDate=?, Rtime=?, Urgent=?, CourseName=?,
                        TrDateFrom=?, TrDateTo=?, TrOrganization=?, TrPlace=?, Detail=?
                 WHERE id=?"
            );
            $stmt->execute([...$fields, $id]);
        } else {
            $stmt = $conn->prepare(
                "INSERT INTO courses (AddID, RDate, Rtime, Urgent, CourseName,
                        TrDateFrom, TrDateTo, TrOrganization, TrPlace, Detail)
                 VALUES (?,?,?,?,?,?,?,?,?,?)"
            );
            $stmt->execute($fields);
            $id = $conn->lastInsertId();
        }

        // เก็บเกียรติบัตรเดิมไว้ก่อนล้างรายชื่อ ไม่งั้นแก้หลักสูตรทีลิงก์เกียรติบัตรหายหมด
        $keep = [];
        $prev = $conn->prepare("SELECT StID, Certificate FROM course_attendees WHERE course_id = ?");
        $prev->execute([$id]);
        foreach ($prev->fetchAll(PDO::FETCH_ASSOC) as $p) {
            $keep[$p['StID']] = $p['Certificate'];
        }

        $conn->prepare("DELETE FROM course_attendees WHERE course_id = ?")->execute([$id]);

        $ins = $conn->prepare(
            "INSERT INTO course_attendees (course_id, StID, TrPlace, Certificate) VALUES (?,?,?,?)"
        );
        $seen = [];
        foreach ($data['attendees'] as $a) {
            $stid = trim($a['StID'] ?? '');
            if ($stid === '' || isset($seen[$stid])) continue;   // กันชื่อซ้ำชน UNIQUE key
            $seen[$stid] = true;

            $place = nn($a['TrPlace'] ?? null);
            // เท่ากับสถานที่หลัก = ไม่ต้องเก็บซ้ำ แก้ที่หัวหลักสูตรแล้วมีผลกับทุกคน
            if ($place !== null && $place === $mainPlace) $place = null;

            $cert = array_key_exists('Certificate', $a)
                ? nn($a['Certificate'])
                : ($keep[$stid] ?? null);

            $ins->execute([$id, $stid, $place, $cert]);
        }

        if (empty($seen)) {
            $conn->rollBack();
            echo json_encode(["success" => false, "message" => "กรุณาเลือกผู้เข้าอบรมอย่างน้อย 1 คน"]);
            exit;
        }

        $conn->commit();
        echo json_encode([
            "success" => true,
            "message" => "บันทึกข้อมูลการฝึกอบรมสำเร็จ",
            "id" => (int)$id
        ], JSON_UNESCAPED_UNICODE);
    }

    elseif ($action === 'delete') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['id'])) {
            echo json_encode(["success" => false, "message" => "ไม่พบรายการที่ต้องการลบ"]);
            exit;
        }
        // course_attendees มี ON DELETE CASCADE อยู่แล้ว ลบหัวพอ
        $stmt = $conn->prepare("DELETE FROM courses WHERE id = ?");
        $stmt->execute([$data['id']]);
        echo json_encode(["success" => true, "message" => "ลบข้อมูลการฝึกอบรมสำเร็จ"], JSON_UNESCAPED_UNICODE);
    }

    elseif ($action === 'save_certificate') {
        // แก้ลิงก์เกียรติบัตรรายคน โดยไม่ต้องเปิดฟอร์มหลักสูตรทั้งใบ
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['id'])) {
            echo json_encode(["success" => false, "message" => "ไม่พบรายการผู้เข้าอบรม"]);
            exit;
        }
        $stmt = $conn->prepare("UPDATE course_attendees SET Certificate = ? WHERE id = ?");
        $stmt->execute([nn($data['Certificate'] ?? null), $data['id']]);
        echo json_encode(["success" => true, "message" => "บันทึกลิงก์เกียรติบัตรสำเร็จ"], JSON_UNESCAPED_UNICODE);
    }

    else {
        echo json_encode(["success" => false, "message" => "ไม่รู้จักคำสั่ง: $action"]);
    }

} catch (PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
