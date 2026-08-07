import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { DEFAULT_PERMISSIONS, SUPERUSER_TYPE, isMenuAllowed, type MenuPermissions } from '../../config/menuAccess';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle,
  Calendar, 
  Home as HomeIcon,
  Settings, 
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
  BarChart2,
  Clock,
  Coins,
  GraduationCap
} from 'lucide-react';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path?: string;
  menuKey: string;
  tooltip?: string;
  children?: { label: string; path: string; menuKey: string }[];
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'รายงาน': true // Default open reports
  });

  // สิทธิ์เมนูตาม user_type (admin เห็นครบเสมอ)
  const [permissions, setPermissions] = useState<MenuPermissions>(DEFAULT_PERMISSIONS);

  // รูปเจ้าหน้าที่มาจาก login.php (join staffs) — บัญชีที่ล็อกอินค้างไว้ก่อนอัปเดต
  // จะยังไม่มีค่านี้ จึงต้องมีตัวอักษรย่อเป็นตัวสำรองเสมอ
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = adminUser.image ? `/dcms/${adminUser.image}` : null;
  const roleLabel =
    adminUser.user_type === 'admin' ? 'ผู้ดูแลระบบ' : adminUser.user_type || 'ผู้ใช้งาน';

  useEffect(() => {
    // admin เห็นทุกเมนูอยู่แล้ว ไม่ต้องยิง API
    if (adminUser.user_type === SUPERUSER_TYPE) return;

    axios.get('/dcms/api/admin/user_type_permissions.php?action=get')
      .then(res => {
        if (res.data.success) setPermissions(res.data.data.permissions);
      })
      .catch(() => {
        // โหลดไม่ได้ = คงค่าเริ่มต้นเดิมไว้ ดีกว่าซ่อนเมนูทั้งหมด
      });
  }, [adminUser.user_type]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    // ล้าง session ฝั่งเซิร์ฟเวอร์ด้วย ไม่งั้น cookie เดิมยังเรียก api/admin/ ได้ต่อ
    try {
      await axios.post('/dcms/api/logout.php');
    } catch {
      // ยิงไม่ผ่านก็ยังต้องออกจากระบบฝั่งนี้ให้ผู้ใช้
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const menuItems: MenuItem[] = [
    { icon: <LayoutDashboard size={20} />, menuKey: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', tooltip: 'แดชบอร์ด' },
    {
      icon: <UserCircle size={20} />,
      menuKey: 'staff',
      label: 'ข้อมูลเจ้าหน้าที่',
      path: '/admin/staff',
      tooltip: 'จัดการข้อมูลเจ้าหน้าที่'
    },
    { icon: <Clock size={20} />, menuKey: 'outside-work', label: 'ปฏิบัติงานนอกเวลาราชการ', path: '/admin/outside-work', tooltip: 'บันทึกและจัดการปฏิบัติงานนอกเวลาราชการ' },
    { icon: <Calendar size={20} />, menuKey: 'outside-work-leave', label: 'แก้ไขวันลา', path: '/admin/outside-work-leave', tooltip: 'แก้ไขวันลา ปฏิบัติงานนอกเวลาราชการ' },
    { icon: <Clock size={20} />, menuKey: 'outside-work-special', label: 'นอกเวลาราชการ (พิเศษ)', path: '/admin/outside-work-special', tooltip: 'บันทึกและจัดการปฏิบัติงานนอกเวลาราชการ กรณีพิเศษ' },
    { icon: <Calendar size={20} />, menuKey: 'outside-work-special-leave', label: 'แก้ไขวันลา นอกราชการ(พิเศษ)', path: '/admin/outside-work-special-leave', tooltip: 'แก้ไขวันลา นอกราชการ (พิเศษ)' },
    { icon: <Users size={20} />, menuKey: 'counselors', label: 'จัดการนักแนะแนว', path: '/admin/counselors', tooltip: 'จัดการข้อมูลนักแนะแนว' },
    { icon: <Calendar size={20} />, menuKey: 'appointments', label: 'การนัดหมาย', path: '/admin/appointments', tooltip: 'จัดการการนัดหมายกับนักศึกษา' },
    { icon: <HomeIcon size={20} />, menuKey: 'wfh', label: 'จัดการ WFH', path: '/admin/wfh', tooltip: 'จัดการการปฏิบัติงานจากบ้าน' },
    { icon: <GraduationCap size={20} />, menuKey: 'courses', label: 'จัดการการฝึกอบรม', path: '/admin/courses', tooltip: 'บันทึกหลักสูตรฝึกอบรมและรายชื่อเจ้าหน้าที่ที่เข้าร่วม' },
    {
      icon: <BarChart2 size={20} />,
      menuKey: 'reports',
      label: 'รายงาน',
      tooltip: 'ดูและสร้างรายงาน',
      children: [
        { label: 'รายงานประจำเดือน', path: '/admin/reports/monthly', menuKey: 'reports.monthly' },
        { label: 'สำหรับผู้บริหาร', path: '/admin/reports/executive', menuKey: 'reports.executive' },
        { label: 'รายงานแบบแก้ไขได้', path: '/admin/reports/editable', menuKey: 'reports.editable' }
      ]
    },
    { icon: <Coins size={20} />, menuKey: 'work-rates', label: 'จัดการค่าธรรมเนียม', path: '/admin/work-rates', tooltip: 'กำหนดชั่วโมงและอัตราค่าตอบแทนเริ่มต้นในการปฏิบัติงานนอกเวลาราชการ' },
    { icon: <Settings size={20} />, menuKey: 'settings', label: 'ตั้งค่าระบบ', path: '/admin/settings', tooltip: 'ตั้งค่าพื้นฐานของระบบ' },
  ];

  const isActive = (path?: string) => path ? location.pathname === path : false;
  const isChildActive = (children?: { path: string }[]) => 
    children ? children.some(child => location.pathname === child.path) : false;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="bg-primary p-1 rounded">AR</div>
            <span>Admin Center</span>
          </h2>
        </div>
        
        <nav className="flex-grow p-4 space-y-2 mt-4 overflow-y-auto">
          {menuItems
            .map(item => item.children
              // เก็บเฉพาะเมนูย่อยที่มีสิทธิ์
              ? { ...item, children: item.children.filter(c => isMenuAllowed(c.menuKey, adminUser.user_type, permissions)) }
              : item)
            .filter(item => {
              if (!isMenuAllowed(item.menuKey, adminUser.user_type, permissions)) return false;
              // เมนูแม่ที่ลูกถูกปิดหมด ไม่ต้องแสดง (กดแล้วว่างเปล่า)
              return !item.children || item.children.length > 0;
            })
            .map((item) => (
            <div key={item.label}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(item.label)}
                    title={item.tooltip}
                    className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors group ${isChildActive(item.children) ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.icon}
                      <span className="font-medium group-hover:text-white truncate">{item.label}</span>
                    </div>
                    {openSubmenus[item.label] ? <ChevronDown size={16} className="flex-shrink-0" /> : <ChevronRight size={16} className="flex-shrink-0" />}
                  </button>
                  {openSubmenus[item.label] && (
                    <div className="mt-1 ml-9 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`block p-2 text-sm rounded-lg transition-colors truncate ${isActive(child.path) ? 'text-white bg-primary/20 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path!}
                  title={item.tooltip}
                  className={`flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors group ${isActive(item.path) ? 'bg-primary text-white' : 'text-slate-300'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon}
                    <span className="font-medium group-hover:text-white truncate">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className={`${isActive(item.path) ? 'text-white' : 'text-slate-600'} group-hover:text-white flex-shrink-0 ml-2`} />
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* ตัวตนผู้ใช้กับปุ่มออกจากระบบย้ายไปอยู่มุมขวาบนของ navbar ทั้งคู่แล้ว
            ไม่ต้องมีซ้ำตรงนี้อีก แถบเมนูจึงเหลือพื้นที่ให้รายการเมนูเต็ม ๆ */}
      </aside>

      {/* Main Content */}
      <main className="flex-grow">
        <header className="bg-white h-16 shadow-sm flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Menu className="md:hidden" />
            Panel Control
          </h1>
          {/* มุมขวาบน = ที่ที่ผู้ใช้คาดว่าจะเจอตัวตนตัวเองกับปุ่มออกจากระบบ
              จอแคบซ่อนข้อความไว้ เหลือแค่ไอคอน ปุ่มจึงไม่เบียดหัวข้อ */}
          <div className="flex items-center gap-3">
            <span className="hidden xl:block text-sm text-gray-500">
              ระบบบริหารจัดการข้อมูล AR2Home
            </span>
            <span className="hidden xl:block h-6 w-px bg-gray-200" aria-hidden="true" />

            {/* ตัวตนผู้ใช้ วางไว้ก่อนปุ่มออกจากระบบ */}
            <div className="flex items-center gap-2.5 min-w-0">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt=""
                  onError={() => setAvatarError(true)}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-bold text-sm ring-2 ring-gray-100 flex-shrink-0">
                  {adminUser.fullname?.[0] || 'A'}
                </div>
              )}
              <div className="hidden md:block min-w-0 leading-tight">
                <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
                  {[adminUser.title, adminUser.fullname].filter(Boolean).join('') ||
                    'Administrator'}
                </p>
                <p className="text-[11px] text-gray-400 truncate">{roleLabel}</p>
              </div>
            </div>

            <span className="h-6 w-px bg-gray-200" aria-hidden="true" />
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                         text-gray-500 hover:text-red-600 hover:bg-red-50 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                         transition-all duration-200"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </header>
        
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
