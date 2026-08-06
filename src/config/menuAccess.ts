/**
 * แคตตาล็อกเมนูหลังบ้าน ใช้ร่วมกันระหว่าง side menu (AdminLayout)
 * กับหน้ากำหนดสิทธิ์การเข้าถึงตาม user_type
 *
 * key ต้องคงที่ เพราะถูกบันทึกลงตาราง settings — เปลี่ยน key = สิทธิ์ที่เคยตั้งไว้หาย
 */
export interface MenuAccessItem {
  key: string;
  label: string;
}

export const MENU_CATALOG: MenuAccessItem[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'staff', label: 'ข้อมูลเจ้าหน้าที่' },
  { key: 'outside-work', label: 'ปฏิบัติงานนอกเวลาราชการ' },
  { key: 'outside-work-leave', label: 'แก้ไขวันลา' },
  { key: 'outside-work-special', label: 'นอกเวลาราชการ (พิเศษ)' },
  { key: 'outside-work-special-leave', label: 'แก้ไขวันลา นอกราชการ (พิเศษ)' },
  { key: 'counselors', label: 'จัดการนักแนะแนว' },
  { key: 'appointments', label: 'การนัดหมาย' },
  { key: 'wfh', label: 'จัดการ WFH' },
  { key: 'reports', label: 'รายงาน' },
  { key: 'work-rates', label: 'จัดการค่าธรรมเนียม' },
  { key: 'settings', label: 'ตั้งค่าระบบ' },
];

/**
 * เมนูย่อย — คุมสิทธิ์แยกรายอันได้ ใต้เมนูแม่เดียวกัน
 * เมนูแม่จะแสดงก็ต่อเมื่อมีสิทธิ์เมนูแม่ และมีสิทธิ์เมนูย่อยอย่างน้อย 1 อัน
 */
export const SUBMENU_CATALOG: Record<string, MenuAccessItem[]> = {
  reports: [
    { key: 'reports.monthly', label: 'รายงานประจำเดือน' },
    { key: 'reports.executive', label: 'สำหรับผู้บริหาร' },
    { key: 'reports.editable', label: 'รายงานแบบแก้ไขได้' },
  ],
};

export const ALL_SUBMENU_KEYS = Object.values(SUBMENU_CATALOG)
  .flat()
  .map(item => item.key);

/**
 * สิทธิ์ระดับปุ่ม/การกระทำ (ไม่ใช่เมนู) — เก็บรวมใน map สิทธิ์ชุดเดียวกับเมนู
 * ทุกคีย์ต้องตรงกับ ACTION_KEYS ใน api/admin/user_types_lib.php
 */
export const ACTION_CATALOG: MenuAccessItem[] = [
  { key: 'staff.edit', label: 'แก้ไขข้อมูลเจ้าหน้าที่' },
  { key: 'staff.delete', label: 'ลบข้อมูลเจ้าหน้าที่' },
  { key: 'staff.export', label: 'ส่งออก Excel' },
  { key: 'staff.create', label: 'เพิ่มเจ้าหน้าที่ใหม่' },
  { key: 'staff.departments', label: 'จัดการฝ่าย/แผนก' },
  { key: 'staff.usertypes', label: 'จัดการ user_type' },
];

/** รายการทั้งหมดที่แสดงในตารางกำหนดสิทธิ์ */
export const ACCESS_CATALOG = [...MENU_CATALOG, ...ACTION_CATALOG];

export const ALL_MENU_KEYS = MENU_CATALOG.map(item => item.key);

/** user_type ที่เป็น superuser เข้าถึงได้ทุกเมนูเสมอ แก้สิทธิ์และลบไม่ได้ */
export const SUPERUSER_TYPE = 'admin';

export interface UserTypeOption {
  code: string;
  name: string;
  is_system: boolean;
}

/** map สิทธิ์ {user_type: [menuKey,...]} — ไม่มีคีย์ของ admin เพราะเข้าถึงได้ทุกเมนูอยู่แล้ว */
export type MenuPermissions = Record<string, string[]>;

/**
 * ค่าเริ่มต้น = พฤติกรรมเดิมของระบบ (staff เห็นทุกเมนูยกเว้นข้อมูลเจ้าหน้าที่)
 * ใช้เมื่อยังไม่เคยตั้งค่า หรือโหลดค่าจากเซิร์ฟเวอร์ไม่สำเร็จ
 */
export const DEFAULT_STAFF_MENU_KEYS = [
  ...ALL_MENU_KEYS.filter(key => key !== 'staff'),
  ...ALL_SUBMENU_KEYS,
];

export const DEFAULT_PERMISSIONS: MenuPermissions = { staff: DEFAULT_STAFF_MENU_KEYS };

/** ประเภทที่สร้างใหม่เริ่มด้วยสิทธิ์ขั้นต่ำ ให้ผู้ดูแลติ๊กเพิ่มเอง */
export const DEFAULT_NEW_TYPE_MENU_KEYS = ['dashboard'];

export const isMenuAllowed = (
  menuKey: string,
  userType: string | undefined,
  permissions: MenuPermissions
): boolean => {
  if (userType === SUPERUSER_TYPE) return true;
  if (!userType) return false;
  return (permissions[userType] || []).includes(menuKey);
};

/** ใช้ตัวเดียวกับเมนู แยกชื่อไว้ให้อ่านง่ายตอนเช็คสิทธิ์ปุ่ม */
export const isActionAllowed = isMenuAllowed;
