-- ตารางการฝึกอบรม (module: จัดการการฝึกอบรม)
-- courses           = ข้อมูลหลักสูตร/หนังสือเชิญ 1 เรื่อง
-- course_attendees  = เจ้าหน้าที่ที่เข้าอบรมในหลักสูตรนั้น (1 หลักสูตรมีได้หลายคน)
--
-- ที่มา: course.md เป็น 1 แถวต่อ (หลักสูตร x คน) หลักสูตรเดียวกันซ้ำได้ถึง 5 แถว
-- จึงแยกหัวหลักสูตรออกมา ไม่งั้นแก้ชื่อหลักสูตรทีต้องไล่แก้ทุกแถว

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `AddID` VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'เลขที่หนังสือ',
  `RDate` DATE DEFAULT NULL COMMENT 'วันที่รับหนังสือ',
  `Rtime` TIME DEFAULT NULL COMMENT 'เวลารับหนังสือ',
  `Urgent` VARCHAR(20) NOT NULL DEFAULT 'ปกติ' COMMENT 'ชั้นความเร็ว: ปกติ/ด่วน/ด่วนที่สุด',
  `CourseName` TEXT NOT NULL COMMENT 'ชื่อหลักสูตร/เรื่อง',
  `TrDateFrom` DATE DEFAULT NULL,
  `TrDateTo` DATE DEFAULT NULL,
  `TrOrganization` VARCHAR(255) DEFAULT NULL COMMENT 'หน่วยงานที่จัด',
  `TrPlace` VARCHAR(255) DEFAULT NULL COMMENT 'สถานที่หลัก (ใช้เป็นค่าตั้งต้นของผู้เข้าอบรม)',
  `Detail` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courses_trdate` (`TrDateFrom`),
  KEY `idx_courses_addid` (`AddID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_attendees` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `course_id` INT NOT NULL,
  `StID` VARCHAR(15) NOT NULL,
  -- สถานที่ของคนนี้โดยเฉพาะ: NULL = ใช้ตาม courses.TrPlace
  -- ข้อมูลจริงมีกรณีหลักสูตรเดียวกันแต่คนละสถานที่ (เช่น แบ่งกันไปคนละเขต)
  `TrPlace` VARCHAR(255) DEFAULT NULL,
  `Certificate` TEXT DEFAULT NULL COMMENT 'ลิงก์เกียรติบัตรของคนนี้',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- กันลงชื่อคนเดิมซ้ำในหลักสูตรเดียวกัน
  UNIQUE KEY `uq_course_staff` (`course_id`, `StID`),
  KEY `idx_att_stid` (`StID`),
  CONSTRAINT `fk_att_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ข้อมูลตั้งต้นจาก course.md --------------------------------------------

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (1, 'รง0305.6/ว2104', '2026-06-11', '12:10:00', 'ด่วน', 'โครงการเสริมสร้างคุณธรรมตามหลักปรัชญาเศรษฐกิจพอเพียงแก่บุคคลในสังกัดกระทรวงแรงาน', '2026-06-15', '2026-06-16', 'กองบริหารทรัพยากรบุคคล', 'ศูนย์ฝึกอบรมฝึกโรงเรียนจิตอาสา904(บางเขน)กรุงเทพมหานคร', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (1, 'ST036', NULL, 'https://drive.google.com/file/d/1hGZDQDx_MkQkkAwfM1ReCvLlz-ypiWuO/view?usp=drivesdk');

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (2, 'รง 0306.4/ว2942', '2026-06-12', '14:14:00', 'ด่วนที่สุด', 'ขอเชิญร่วมเป็นเกียรติในพิธีเปิดการประชุมสัมมนาร่วมภาครัฐและภาคเอกชนเพื่อการขยายตลาดแรงงานไทยไปทำงานต่างประเทศ', '2026-06-17', '2026-06-17', 'กองบริหารแรงงานไทยไปต่างประเทศ', 'ณ ห้องบอลรูม 2 ชั้น 3 โรงแรมดิเอมเมอรัลด์ รัชดา กรุงเทพมหานคร', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (2, 'ST038', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (3, 'ยธ 0769/2724', '2026-06-17', '11:02:00', 'ด่วน', 'ขอเรียนเชิญร่วมเป็นเกียรติในพิธีเปิดการอบรมโครงการพระราชทานในพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว "โคกหนองนาแห่งน้ำใจและความหวัง กรมราชทัณฑ์" ตามพระราชกฤษฎีกาพระราชทานอภัยโทษ พ.ศ. 2569 รุ่นที่ 8/1', '2026-06-19', '2026-06-19', 'เรือนจำพิเศษธนบุรี', 'เรือนจำพิเศษธนบุรี', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (3, 'ST0035', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (4, 'รง 0308.5/ว9341', '2026-06-19', '13:34:00', 'ด่วน', 'โครงการประชุมเเชิงปฏิบัติการเพื่อทบทวนแผนปฏิบัติราชการระยะ 5 ปี (พ.ศ.2570)ของกรมการจัดหางาน และเตรียมจัดทำแผนปฏิบัติราชการระยะ 5 ปี (พ.ศ.2575)ของกรมการจัดหางาน', '2026-06-30', '2026-07-02', 'กองยุทธศาสตร์และแผนงาน', 'ณ ห้องแกรนด์บอลรูม ชั้น 2 โรงแรมเอล รัชดา เลเซอร์ ห้วยขวาง กทม.', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (4, 'ST034', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (5, 'รง 0309.5/ว 9190', '2026-06-17', '10:25:00', 'ด่วน', 'การอบรมเชิงปฏิบัติการเพื่อเพิ่มประสิทธิภาพในการปฏิบัติงานของเจ้าหน้าที่ผู้ปฏิบัติงานด้านส่งเสริมการรับงานไปทำที่บ้านและกองทุนเพื่อผู้รับงานไปทำที่บ้าน ประจำปีบัญชี 2569', '2026-06-30', '2026-06-30', 'กองส่งเสริมการมีงานทำ', 'ห้องประชุมเทียนอัชกุล ชั้น 10', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (5, 'ST0035', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (5, 'ST008', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (6, 'รง 0305.5/ว2303', '2026-07-01', '15:17:00', 'ด่วนที่สุด', 'ขอเชิญประชุมคณะกรรมการกลั่นกรองผลการปฏิบัติราชการของข้าราชการพลเรือนสามัญ พนักงานราชการและพนักงานกองทุน', '2026-07-03', '2026-07-03', 'กองบริหารทรัพยากรบุคคล', 'VDO Conference', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (6, 'ST034', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (7, 'ยธ 0769/3030', '2026-07-02', '10:10:00', 'ด่วน', 'ขอเรียนเชิญร่วมเป็นเกียรติในพิธีปิดการฝึกอบรมโครงการพระราชทานในพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว "โครงการหนองนาแห่งน้ำใจและความหวัง กรมราชทัณฑ์" ตามพระราชกฤษฎีกาพระราชทานอภัยโทษ พ.ศ.2569 รุ่นที่ 8/1', '2026-07-03', '2026-07-03', 'เรือนจำพิเศษธนบุรี', 'เรือนจำพิเศษธนบุรี', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (7, 'ST034', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (8, 'รง 0305.6/ว9909', '2026-07-01', '10:52:00', 'ด่วน', 'จัดส่งรายชื่อผู้ตอบแบบวัดผู้มีส่วนได้ส่วนเสียภายใน (IIT)', '2026-07-14', '2026-07-14', 'กองบริหารทรัพยากรบุคคล', 'ห้องประชุมเทียนอัชกุล ชั้น 10', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (8, 'ST034', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (9, 'รง 0301.2/ว3477', '2026-07-03', '11:37:00', 'ด่วน', 'การจัดข้าราชการเฝ้าฯ ในพระพิธีธรรมสวดพระอภิธรรมพระศพ สมเด็จพระเจ้าลูกเธอ เจ้าฟ้าพัชรกิติยาภานเรนพิรายวดี กรมหลวงราชสารินีสิริพัชร มหารัชรราธิดา', '2026-08-01', '2026-08-01', 'สำนักงานเลขานุการกรม', 'ณ พระที่นั่งพิมานรัตนา ในพระบรมมหาราชวัง', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (9, 'ST0035', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (9, 'ST034', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (10, 'รง 0308.4/1565', '2026-07-13', '09:08:00', 'ด่วนที่สุด', 'ขอเรียนเชิญเข้าประชุมติดตามผลการดำเนินงานของกรมการจัดหางาน ประจำปีงบประมาณ พ.ศ. 2569 ครั้งที่ 2/2569', '2026-07-23', '2026-07-23', 'กองยุทธศาสตร์และแผนงาน', 'VDO Conference', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (10, 'ST034', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (10, 'ST038', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (10, 'ST0035', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (10, 'ST037', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (11, 'รง 0302.5/5235', '2026-07-09', '08:50:00', 'ด่วนที่สุด', 'ขอเชิญเข้าร่วมการประชุมติดตามผลการดำเนินโครงการ/กิจกรรมของกองทะเบียนจัดหางานกลางและคุัมครองคนหางาน ประจำปีงบประมาณ พ.ศ. 2569', '2026-07-14', '2026-07-14', 'กองทะเบียนจัดหางานกลางและคุ้มครองแรงงาน', 'VDO Conference', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (11, 'ST038', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (11, 'ST034', 'ณ ห้องประชุมกองทะเบียนจัดหางานกลางและคุ้มครองคนหางาน', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (11, 'ST037', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (12, 'รง 0301.2/ว3655', '2026-07-09', '15:07:00', 'ด่วนที่สุด', 'ขอเชิญเข้าร่วมประชุมกรมการจัดหางาน ครั้งที่ 3/2569', '2026-08-03', '2026-08-03', 'สำนักงานเลขานุการกรม', 'VDO Conference', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (12, 'ST034', 'ณ ห้องประชุมเทียนอัชกุล ชั้น 10', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (12, 'ST038', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (12, 'ST037', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (12, 'ST0035', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (12, 'ST039', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (13, 'รง 0305.6/ว2444', '2026-07-16', '09:41:00', 'ด่วนที่สุด', 'โครงการเสริมสร้างคุณธรรมตามหลักปรัชญาเศรษฐกิจพอเพียงแก่บุคคลในสังกัดกระทรวงแรงาน', '2026-07-17', '2026-07-17', 'กองบริหารทรัพยากรบุคคล', 'ณ ศูนย์ฝึกอบรมฝึกโรงเรียนจิตอาสา904(บางเขน)กรุงเทพมหานคร', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (13, 'ST036', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (14, 'รง 0301.2/ว 3797', '2026-07-17', '12:58:00', 'ด่วนที่สุด', 'ขอเชิญร่วมกิจกรรมถวายพระพรชัยมงคลพระบาทสมเด็จพระเจ้าอยู่หัว เนื่องในโอกาสวันเฉลิมพระชนมพรรษา 28 กรกฎาคม 2569', '2026-07-27', '2026-07-27', 'สำนักงานเลขานุการกรม', 'ณ ห้องประชุมกระทรวงแรงงาน ชั้น 5', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (14, 'ST038', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (14, 'ST034', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (15, 'รง 0301.4/3883', '2026-07-22', '15:46:00', 'ด่วนที่สุด', 'ขอเชิญเข้าร่วมปรุชุมคณะกรรมการสอบหาข้อเท็จจริงกรณีพัสดุชำรุด เสื่อมคุณภาพหรือไม่จำเป็นต้องใช้ในราชการ ครั้งที่ 3', '2026-07-24', '2026-07-24', 'สำนักงานเลขานุการกรม', 'ณ ห้องประชุมตรีเทพ 2 ชั้น 14', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (15, 'ST037', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (16, 'ยธ 0769/3529', '2026-07-27', '10:00:00', 'ด่วน', 'ขอเรียนเชิญร่วมเป็นเียรติในพิธีเปิดการอบรมโครงการพระราชทานในพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว "โคกหนองนาแห่งน้ำใจและความหวัง กรมราชทัณฑ์" ตามพระราชกฤษฎีกาพระราชทานอภัยโทษ พ.ศ. 2569 รุ่นที่ 8/3', '2026-07-31', '2026-07-31', 'เรือนจำพิเศษธนบุรี', 'เรือนจำพิเศษธนบุรี', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (16, 'ST0035', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (17, 'รง 0305.2/2533', '2026-07-27', '11:24:00', 'ด่วนที่สุด', 'ร่วมโครงการสัมมนา เรื่อง มหกรรมการเงิน และการลงทุนภาคประชาชนโดยนโยบายของรัฐ', '2026-08-01', '2026-08-01', 'หน่วยงานของรัฐ', 'ณ ลานกิจกรรม ชั้น 1 ศูนย์การค้าเดอะไบรท์ พระราม 2', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (17, 'ST002', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (17, 'ST008', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (18, 'รง 0310.4/ว 11447', '2026-07-27', '10:23:00', 'ด่วนที่สุด', 'ขอเชิญเข้าร่วมอบรมตามโครงการพัฒนาระบบสารสนเทศการให้บริการจัดหางานแก่คนพิการ มีอาชีพ มีงานทำ ประจำปีงบประมาณ พ.ศ. 2569', '2026-08-18', '2026-08-19', 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร', 'ณ โรงแรมปริ้นตั้น พาร์ค สวีท กทม.', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (18, 'ST008', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (18, 'ST0035', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (19, 'รง 0301.2/ว 3531', '2026-07-27', '10:26:00', 'ด่วนที่สุด', 'ขอเลื่อนวันประชุมกรมการจัดหางาน ครั้งที่ 3/2569', '2026-08-13', '2026-08-13', 'สำนักงานเลขานุการกรม', 'ณ ห้องประชุมเทียนอัชกุล ชั้น 10', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (19, 'ST034', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (20, 'รง 0301.2/ว 3941', '2026-07-27', '10:21:00', 'ด่วนที่สุด', 'ขอความร่วมมือมอบหมายเจ้าหน้าที่เพื่อสนับสนุนภารกิจในการเลือกตั้งผู้แทนฝ่ายนายจ้างและผู้แทนฝ่ายประกันตนเพื่อแต่งตั้งเป็นคณะกรรมการประจำที่เลือกต้ังและเจ้าหน้าที่ผู้ช่วยเหลือการปฏิบัติหน้าที่ของคณะกรรมการที่เลือกตั้งในพื้นที่ของกรุงเทพมหานคร', '2026-09-27', '2026-09-27', 'สำนักงานเลขานุการกรม', 'เขตราษฎร์บูรณะ', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (20, 'ST020', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (20, 'ST002', 'เขตทุ่งครุ', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (20, 'ST008', 'เขตบางคอแหลม', NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (21, 'รง 0316.2 /11526', '2026-07-31', '14:25:00', 'ด่วนที่สุด', 'ขอเชิญเข้าร่วมอบรมเชิงปฏิบัติการโครงการบริหารจัดการแรงงานต่างด้าว เพื่อเสริมสร้างศักยภาพและทักษะเจ้าน้าที่ในการบริหารจัดการการทำงานของคนต่างด้าว ประจำปีงบประมาณ พ.ศ. 2569', '2026-08-05', '2026-08-07', 'สำนักบริหารแรงงานต่างด้าว', 'ณ ห้องบอลรูม 2 ชั้น 3 โรงแรมดิเอมเมอรัลด์ รัชดา กรุงเทพมหานคร', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (21, 'ST034', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (21, 'ST036', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (22, 'รง 0301/ว 4035', '2026-08-04', '10:15:00', 'ด่วน', 'การจัดข้าราชการเฝ้าฯ ในพระพิธีธรรมสวดพระอภิธรรมพระศพ สมเด็จพระเจ้าลูกเธอ เจ้าฟ้าพัชรกิติยาภานเรนพิรายวดี กรมหลวงราชสารินีสิริพัชร มหารัชรราธิดา', '2026-08-28', '2026-08-28', 'สำนักงานเลขานุการกรม', 'ณ พระที่นั่งพิมานรัตนา ในพระบรมมหาราชวัง', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (22, 'ST034', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (22, 'ST038', NULL, NULL);

INSERT INTO `courses` (`id`,`AddID`,`RDate`,`Rtime`,`Urgent`,`CourseName`,`TrDateFrom`,`TrDateTo`,`TrOrganization`,`TrPlace`,`Detail`) VALUES
  (23, 'รง 0310.4/ว 1757', '2026-08-04', '13:32:00', 'ด่วน', 'ขอเชิญเข้าร่วมการฝึกอบรมให้ความรู้ที่เกี่ยวกับเทคโนโลยีสารสนเทศและดิจิทัล เรื่อง "การเสริมสร้างศักยภาพบุคลากรของกรมการจัดหางาน ด้วยเครื่องมือ Google AI"', '2026-08-14', '2026-08-14', 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร', 'ประชุมผ่านสื่ออิเล็กทรอนิกส์', NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (23, 'ST039', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (23, 'ST003', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (23, 'ST037', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (23, 'ST009', NULL, NULL);
INSERT INTO `course_attendees` (`course_id`,`StID`,`TrPlace`,`Certificate`) VALUES (23, 'ST021', NULL, NULL);
