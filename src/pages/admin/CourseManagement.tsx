import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Search,
  Filter,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
  Award,
  X,
  FileText,
  Upload,
  ChevronUp,
  ChevronsUpDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
} from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
  type ExpandedState,
  type FilterFn,
} from '@tanstack/react-table';
import ConfirmModal from '../../components/admin/ConfirmModal';
import ThaiDatePicker from '../../components/admin/ThaiDatePicker';
import Modal, { ModalEmptyState } from '../../components/admin/Modal';
import {
  DEFAULT_PERMISSIONS,
  isActionAllowed,
  isMenuAllowed,
  type MenuPermissions,
} from '../../config/menuAccess';

interface Attendee {
  id?: number;
  StID: string;
  StName?: string | null;
  Title?: string | null;
  DepName?: string | null;
  TrPlace: string | null;
  Certificate: string | null;
}

interface Course {
  id: number;
  AddID: string;
  RDate: string | null;
  Rtime: string | null;
  Urgent: string;
  CourseName: string;
  TrDateFrom: string | null;
  TrDateTo: string | null;
  TrOrganization: string | null;
  TrPlace: string | null;
  Detail: string | null;
  attendees: Attendee[];
}

interface StaffOption {
  StID: string;
  StName: string;
  Title: string | null;
  DepName: string | null;
}

const EMPTY_FORM = {
  id: null as number | null,
  AddID: '',
  RDate: '',
  Rtime: '',
  Urgent: 'ปกติ',
  CourseName: '',
  TrDateFrom: '',
  TrDateTo: '',
  TrOrganization: '',
  TrPlace: '',
  Detail: '',
};

const API = '/dcms/api/admin/courses_management.php';

/** 2026-06-15 -> 15 มิ.ย. 2569 (พ.ศ.) */
const thaiDate = (d: string | null, long = false) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: 'numeric',
  });
};

/**
 * ช่วงวันที่แบบกระชับ ไม่ให้ตกบรรทัดในตาราง
 *   เดือนเดียวกัน  -> 15 - 16 มิ.ย. 2569
 *   ปีเดียวกัน     -> 30 มิ.ย. - 2 ก.ค. 2569
 *   ข้ามปี         -> 30 ธ.ค. 2569 - 2 ม.ค. 2570
 */
const dateRange = (from: string | null, to: string | null) => {
  if (!from) return '-';
  if (!to || to === from) return thaiDate(from);

  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return `${thaiDate(from)} - ${thaiDate(to)}`;

  if (a.getFullYear() === b.getFullYear()) {
    if (a.getMonth() === b.getMonth()) {
      return `${a.getDate()} - ${thaiDate(to)}`;
    }
    // ตัดปีของวันแรกออก เพราะปีเดียวกันกับวันสุดท้ายอยู่แล้ว
    const fromNoYear = a.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    return `${fromNoYear} - ${thaiDate(to)}`;
  }
  return `${thaiDate(from)} - ${thaiDate(to)}`;
};

/**
 * คอลัมน์ Certificate เก็บได้ 2 แบบ
 * - URL ภายนอก (ข้อมูลเดิมเป็นลิงก์ Google Drive)
 * - path ของไฟล์ที่อัปโหลดเอง เช่น api/uploads/certificates/cert_xxx.pdf
 */
const certificateUrl = (v: string | null): string =>
  !v ? '' : /^https?:\/\//i.test(v) ? v : `/dcms/${v}`;

const isUploadedFile = (v: string | null): boolean => !!v && !/^https?:\/\//i.test(v);

const CERT_ACCEPT = '.pdf,.png,.jpg,.jpeg';
const CERT_MAX_SIZE = 10 * 1024 * 1024;

const urgentBadge = (urgent: string) => {
  const style =
    urgent === 'ด่วนที่สุด'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : urgent === 'ด่วน'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${style}`}>
      {urgent || 'ปกติ'}
    </span>
  );
};

const CourseManagement: React.FC = () => {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

  const [courses, setCourses] = useState<Course[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // สถานะของตารางให้ TanStack Table คุมทั้งหมด — ค้นหา/กรอง/เรียง/แบ่งหน้า/ขยายแถว
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  /** อ่าน/เขียนค่าใน columnFilters ผ่าน dropdown — 'all' = ไม่กรองคอลัมน์นั้น */
  const filterValue = (id: string) =>
    (columnFilters.find(f => f.id === id)?.value as string) ?? 'all';

  const setFilter = (id: string, value: string) => {
    setColumnFilters(prev => {
      const rest = prev.filter(f => f.id !== id);
      return value === 'all' ? rest : [...rest, { id, value }];
    });
    setPagination(p => ({ ...p, pageIndex: 0 }));   // กรองใหม่แล้วต้องกลับหน้าแรก
  };

  const [permissions, setPermissions] = useState<MenuPermissions>(DEFAULT_PERMISSIONS);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selected, setSelected] = useState<Attendee[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const canCreate = isActionAllowed('courses.create', adminUser.user_type, permissions);
  const canEdit = isActionAllowed('courses.edit', adminUser.user_type, permissions);
  const canDelete = isActionAllowed('courses.delete', adminUser.user_type, permissions);

  const fetchPermissions = async () => {
    try {
      const res = await axios.get('/dcms/api/admin/user_type_permissions.php?action=get');
      if (res.data.success) setPermissions(res.data.data.permissions);
    } finally {
      // ตั้งเสมอแม้โหลดพลาด ให้ guard ทำงานด้วยค่าเริ่มต้น (เข้มกว่า ปลอดภัยกว่าปล่อยผ่าน)
      setPermissionsLoaded(true);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}?action=list`);
      if (res.data.success) setCourses(res.data.data);
      else toast.error(res.data.message || 'โหลดข้อมูลไม่สำเร็จ');
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลการฝึกอบรมได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API}?action=options`);
      if (res.data.success) {
        setStaffOptions(res.data.options.staffs);
        setOrganizations(res.data.options.organizations);
        setPlaces(res.data.options.places);
      }
    } catch {
      // ไม่มี options ก็ยังกรอกฟอร์มได้ แค่ไม่มีตัวช่วยเติมคำ
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchCourses();
    fetchOptions();
  }, []);

  // ไม่มีสิทธิ์เมนูนี้ = เด้งกลับ ไม่ให้เข้าถึงด้วยการพิมพ์ URL ตรง
  useEffect(() => {
    if (!permissionsLoaded) return;
    if (!isMenuAllowed('courses', adminUser.user_type, permissions)) {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [permissionsLoaded, permissions, adminUser.user_type, navigate]);

  const years = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      if (c.TrDateFrom) set.add(String(new Date(c.TrDateFrom).getFullYear() + 543));
    });
    return Array.from(set).sort().reverse();
  }, [courses]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setSelected([]);
    setStaffSearch('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setForm({
      id: c.id,
      AddID: c.AddID || '',
      RDate: c.RDate || '',
      Rtime: (c.Rtime || '').substring(0, 5),
      Urgent: c.Urgent || 'ปกติ',
      CourseName: c.CourseName,
      TrDateFrom: c.TrDateFrom || '',
      TrDateTo: c.TrDateTo || '',
      TrOrganization: c.TrOrganization || '',
      TrPlace: c.TrPlace || '',
      Detail: c.Detail || '',
    });
    setSelected(c.attendees.map(a => ({ ...a })));
    setStaffSearch('');
    setFormError('');
    setModalOpen(true);
  };

  const toggleStaff = (s: StaffOption) => {
    setSelected(prev =>
      prev.some(a => a.StID === s.StID)
        ? prev.filter(a => a.StID !== s.StID)
        : [
            ...prev,
            {
              StID: s.StID,
              StName: s.StName,
              Title: s.Title,
              DepName: s.DepName,
              TrPlace: null,
              Certificate: null,
            },
          ]
    );
  };

  const updateAttendee = (stid: string, field: 'TrPlace' | 'Certificate', value: string) => {
    setSelected(prev =>
      prev.map(a => (a.StID === stid ? { ...a, [field]: value === '' ? null : value } : a))
    );
  };

  /**
   * อัปโหลดทันทีที่เลือกไฟล์ แล้วเก็บแค่ path ไว้ในฟอร์ม
   * ตัวไฟล์จะถูกผูกกับผู้เข้าอบรมจริงตอนกดบันทึกหลักสูตร
   * (ตอนเพิ่มหลักสูตรใหม่ยังไม่มีแถวใน DB ให้ผูก จึงต้องแยกสองขั้นแบบนี้)
   */
  const handleCertUpload = async (stid: string, file: File) => {
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) {
      toast.error('รองรับเฉพาะไฟล์ .pdf .png .jpg เท่านั้น');
      return;
    }
    if (file.size > CERT_MAX_SIZE) {
      toast.error(`ไฟล์ใหญ่เกิน 10 MB (ไฟล์นี้ ${(file.size / 1048576).toFixed(1)} MB)`);
      return;
    }

    setUploading(prev => ({ ...prev, [stid]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post('/dcms/api/admin/course_certificate_upload.php', fd);
      if (res.data.success) {
        updateAttendee(stid, 'Certificate', res.data.path);
        toast.success(`อัปโหลด ${res.data.filename} สำเร็จ`);
      } else {
        toast.error(res.data.message || 'อัปโหลดไม่สำเร็จ');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(prev => ({ ...prev, [stid]: false }));
    }
  };

  const handleSave = async () => {
    if (!form.CourseName.trim()) {
      setFormError('กรุณากรอกชื่อหลักสูตร');
      return;
    }
    if (selected.length === 0) {
      setFormError('กรุณาเลือกผู้เข้าอบรมอย่างน้อย 1 คน');
      return;
    }
    if (form.TrDateFrom && form.TrDateTo && form.TrDateTo < form.TrDateFrom) {
      setFormError('วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่ม');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const res = await axios.post(`${API}?action=save`, {
        ...form,
        Rtime: form.Rtime ? `${form.Rtime}:00` : '',
        attendees: selected.map(a => ({
          StID: a.StID,
          TrPlace: a.TrPlace,
          Certificate: a.Certificate,
        })),
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setModalOpen(false);
        fetchCourses();
        fetchOptions();
      } else {
        setFormError(res.data.message || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (c: Course) => {
    setConfirmModal({
      open: true,
      title: 'ยืนยันการลบหลักสูตร',
      message: (
        <div className="space-y-2">
          <p className="font-medium text-gray-700">{c.CourseName}</p>
          <p>
            ผู้เข้าอบรม {c.attendees.length} คนในหลักสูตรนี้จะถูกลบไปด้วย
            และไม่สามารถย้อนกลับได้
          </p>
        </div>
      ),
      onConfirm: async () => {
        try {
          const res = await axios.post(`${API}?action=delete`, { id: c.id });
          if (res.data.success) {
            toast.success(res.data.message);
            fetchCourses();
          } else {
            toast.error(res.data.message);
          }
        } catch {
          toast.error('ลบข้อมูลไม่สำเร็จ');
        }
      },
    });
  };

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffOptions;
    return staffOptions.filter(
      s =>
        s.StName.toLowerCase().includes(q) ||
        s.StID.toLowerCase().includes(q) ||
        (s.DepName || '').toLowerCase().includes(q)
    );
  }, [staffOptions, staffSearch]);

  /* ---------------- TanStack Table ---------------- */

  const columnHelper = createColumnHelper<Course>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'expander',
        header: () => null,
        meta: { cellClass: 'pl-4 pr-1 py-4 align-top' },
        cell: ({ row }) => (
          <button
            onClick={row.getToggleExpandedHandler()}
            aria-expanded={row.getIsExpanded()}
            className="p-1 text-gray-400 hover:text-primary rounded-lg hover:bg-white transition-colors"
            title={row.getIsExpanded() ? 'ย่อรายชื่อ' : 'ดูรายชื่อผู้เข้าอบรม'}
          >
            {row.getIsExpanded() ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ),
      }),

      // accessor คืนเป็นสตริง '' เมื่อไม่มีวันที่ ไม่ใช่ null
      // เพราะ null ทำให้ตัวเรียงของ TanStack สลับที่ไปมาไม่คงที่
      columnHelper.accessor(row => row.TrDateFrom ?? '', {
        id: 'TrDateFrom',
        header: 'วันที่อบรม',
        meta: { cellClass: 'px-5 py-4 align-top' },
        cell: ({ row }) => (
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 font-bold text-gray-800 text-[13px] leading-snug">
              <Calendar size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="[word-break:keep-all]">
                {dateRange(row.original.TrDateFrom, row.original.TrDateTo)}
              </span>
            </div>
            {urgentBadge(row.original.Urgent)}
          </div>
        ),
      }),

      columnHelper.accessor('CourseName', {
        header: 'หลักสูตร / เรื่อง',
        meta: { cellClass: 'px-5 py-4 align-top' },
        cell: ({ row }) => (
          <>
            {/* ตัด 2 บรรทัดให้ทุกแถวสูงเท่ากัน ชื่อเต็มดูได้จาก tooltip หรือกดขยายแถว */}
            <div
              className="font-semibold text-gray-800 leading-snug line-clamp-2"
              title={row.original.CourseName}
            >
              {row.original.CourseName}
            </div>
            {row.original.AddID && (
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <FileText size={12} />
                {row.original.AddID}
                {row.original.RDate && (
                  <span className="text-gray-400">· รับ {thaiDate(row.original.RDate)}</span>
                )}
              </div>
            )}
          </>
        ),
      }),

      columnHelper.accessor(row => row.TrOrganization ?? '', {
        id: 'TrOrganization',
        header: 'หน่วยงาน / สถานที่',
        meta: { cellClass: 'px-5 py-4 text-[13px] align-top' },
        cell: ({ row }) => (
          <div className="space-y-1">
            {row.original.TrOrganization && (
              <div
                className="flex items-center gap-1.5 text-gray-700"
                title={row.original.TrOrganization}
              >
                <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{row.original.TrOrganization}</span>
              </div>
            )}
            {row.original.TrPlace && (
              <div
                className="flex items-center gap-1.5 text-gray-500"
                title={row.original.TrPlace}
              >
                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{row.original.TrPlace}</span>
              </div>
            )}
          </div>
        ),
      }),

      columnHelper.accessor(row => row.attendees.length, {
        id: 'attendeeCount',
        header: 'ผู้เข้าอบรม',
        meta: { cellClass: 'px-3 py-4 text-center align-top' },
        cell: ({ getValue }) => (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-primary rounded-full text-sm font-bold">
            <Users size={14} />
            {getValue()}
          </span>
        ),
      }),

      columnHelper.display({
        id: 'actions',
        header: 'เครื่องมือ',
        meta: { cellClass: 'px-4 py-4 text-right align-top' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canEdit && (
              <button
                onClick={() => openEdit(row.original)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="แก้ไขหลักสูตร"
              >
                <Pencil size={18} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row.original)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="ลบหลักสูตร"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ),
      }),

      // สองคอลัมน์นี้ซ่อนไว้ มีไว้ให้ dropdown ด้านบนกรองเท่านั้น
      // TanStack กรองคอลัมน์ที่ซ่อนอยู่ได้ จึงไม่ต้องแยก logic ออกไปกรองเอง
      columnHelper.accessor('Urgent', {
        id: 'Urgent',
        enableSorting: false,
      }),
      columnHelper.accessor(
        row => (row.TrDateFrom ? String(new Date(row.TrDateFrom).getFullYear() + 543) : ''),
        { id: 'trYear', enableSorting: false }
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, canDelete]
  );

  /**
   * ค้นหารวม — ต้องเขียนเองเพราะต้องมองเข้าไปถึงชื่อผู้เข้าอบรมในแถวลูก
   * ตัวกรองมาตรฐานของ TanStack ดูได้แค่ค่าในคอลัมน์ที่ประกาศไว้
   */
  const globalFilterFn: FilterFn<Course> = (row, _columnId, value) => {
    const q = String(value ?? '').trim().toLowerCase();
    if (!q) return true;
    const c = row.original;
    return (
      c.CourseName.toLowerCase().includes(q) ||
      (c.AddID || '').toLowerCase().includes(q) ||
      (c.TrOrganization || '').toLowerCase().includes(q) ||
      (c.TrPlace || '').toLowerCase().includes(q) ||
      c.attendees.some(a => (a.StName || '').toLowerCase().includes(q))
    );
  };

  const table = useReactTable({
    data: courses,
    columns,
    state: { sorting, columnFilters, globalFilter, expanded, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    globalFilterFn,
    getRowId: row => String(row.id),
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { columnVisibility: { Urgent: false, trYear: false } },
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const totalAttendees = filteredRows.reduce((sum, r) => sum + r.original.attendees.length, 0);
  const totalCertificates = filteredRows.reduce(
    (sum, r) => sum + r.original.attendees.filter(a => a.Certificate).length,
    0
  );
  const visibleColCount = table.getVisibleFlatColumns().length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">จัดการการฝึกอบรม</h2>
          <p className="text-gray-500">
            บันทึกหลักสูตร/การประชุม และรายชื่อเจ้าหน้าที่ที่เข้าร่วม
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            เพิ่มหลักสูตร
          </button>
        )}
      </div>

      {/* สรุปตัวเลข */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-primary">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{filteredRows.length}</div>
            <div className="text-xs text-gray-500 font-medium">หลักสูตร</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Users size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{totalAttendees}</div>
            <div className="text-xs text-gray-500 font-medium">รายการเข้าอบรม</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Award size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {totalCertificates}
            </div>
            <div className="text-xs text-gray-500 font-medium">มีเกียรติบัตร</div>
          </div>
        </div>
      </div>

      {/* ค้นหา + ตัวกรอง */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อหลักสูตร เลขที่หนังสือ หน่วยงาน หรือชื่อผู้เข้าอบรม..."
            value={globalFilter}
            onChange={e => {
              setGlobalFilter(e.target.value);
              setPagination(p => ({ ...p, pageIndex: 0 }));
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <Filter size={18} />
            </span>
            <select
              value={filterValue('Urgent')}
              onChange={e => setFilter('Urgent', e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 appearance-none font-medium text-gray-700"
            >
              <option value="all">ทุกชั้นความเร็ว</option>
              <option value="ปกติ">ปกติ</option>
              <option value="ด่วน">ด่วน</option>
              <option value="ด่วนที่สุด">ด่วนที่สุด</option>
            </select>
          </div>
          <select
            value={filterValue('trYear')}
            onChange={e => setFilter('trYear', e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 appearance-none font-medium text-gray-700"
          >
            <option value="all">ทุกปี</option>
            {years.map(y => (
              <option key={y} value={y}>
                พ.ศ. {y}
              </option>
            ))}
          </select>
          <button
            onClick={fetchCourses}
            className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <Loader2 className={loading ? 'animate-spin' : ''} size={20} />
          </button>
        </div>
      </div>

      {/* ตารางหลักสูตร */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {/* table-fixed + colgroup: ไม่งั้นเบราว์เซอร์จัดความกว้างตามความยาวข้อความ
              คอลัมน์ชื่อหลักสูตรจะกินพื้นที่จนคอลัมน์อื่นเบียดกัน */}
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-[215px]" />
              <col className="max-w-0" />
              <col className="w-[260px]" />
              <col className="w-[124px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr
                  key={hg.id}
                  className="bg-gray-50 text-gray-500 text-[11px] font-bold"
                >
                  {hg.headers.map(header => {
                    const align =
                      header.column.id === 'attendeeCount'
                        ? 'text-center'
                        : header.column.id === 'actions'
                        ? 'text-right'
                        : '';
                    return (
                      <th
                        key={header.id}
                        className={`px-5 py-3 border-b border-gray-200 whitespace-nowrap ${align} ${
                          header.column.id === 'expander' ? 'pl-4 pr-1' : ''
                        }`}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                            title="คลิกเพื่อเรียงลำดับ"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {/* ไอคอนจาง ๆ ตอนยังไม่เรียง บอกว่าหัวคอลัมน์นี้กดได้ */}
                            {{
                              asc: <ChevronUp size={13} />,
                              desc: <ChevronDown size={13} />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ChevronsUpDown size={13} className="text-gray-300" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={visibleColCount} className="py-20 text-center">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-400 font-medium">กำลังโหลดข้อมูลการฝึกอบรม...</p>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="py-20 text-center">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="w-10 h-10 text-gray-300" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-400">ไม่พบข้อมูลการฝึกอบรม</h4>
                    <p className="text-gray-400 mt-1 italic">
                      {courses.length === 0
                        ? 'ยังไม่มีหลักสูตรในระบบ'
                        : 'ลองปรับคำค้นหาหรือตัวกรอง'}
                    </p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const c = row.original;
                  return (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-blue-50/40 transition-colors group align-top">
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={
                            (cell.column.columnDef.meta as { cellClass?: string } | undefined)
                              ?.cellClass ?? 'px-4 py-5'
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>

                    {row.getIsExpanded() && (
                      <tr className="bg-slate-50/60">
                        <td></td>
                        <td colSpan={visibleColCount - 1} className="px-4 py-4">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            ผู้เข้าอบรม {c.attendees.length} คน
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {c.attendees.map(a => (
                              <div
                                key={a.id ?? a.StID}
                                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3"
                              >
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm flex-shrink-0">
                                  {(a.StName || a.StID).charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-800 text-sm truncate">
                                    {a.Title || ''}
                                    {a.StName || a.StID}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {a.DepName || '-'}
                                  </div>
                                  {a.TrPlace && (
                                    <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                      <MapPin size={11} />
                                      {a.TrPlace}
                                    </div>
                                  )}
                                </div>
                                {a.Certificate && (
                                  <a
                                    href={certificateUrl(a.Certificate)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex-shrink-0"
                                    title={isUploadedFile(a.Certificate) ? 'เปิดไฟล์เกียรติบัตร' : 'เปิดลิงก์เกียรติบัตร'}
                                  >
                                    <Award size={16} />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                          {c.Detail && (
                            <div className="mt-3 text-sm text-gray-600 bg-white rounded-xl border border-gray-100 px-4 py-3">
                              <span className="font-bold text-gray-500 text-xs uppercase tracking-wider">
                                หมายเหตุ
                              </span>
                              <p className="mt-1 leading-relaxed">{c.Detail}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* แบ่งหน้า — ซ่อนเมื่อข้อมูลไม่ถึงหนึ่งหน้า จะได้ไม่รกโดยเปล่าประโยชน์ */}
        {!loading && filteredRows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                แสดง{' '}
                <span className="font-bold text-gray-700">
                  {table.getRowModel().rows.length}
                </span>{' '}
                จาก{' '}
                <span className="font-bold text-gray-700">{filteredRows.length}</span> หลักสูตร
              </span>
              <select
                value={pagination.pageSize}
                onChange={e =>
                  setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
                }
                className="px-2 py-1 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>
                    {n} แถว
                  </option>
                ))}
              </select>
            </div>

            {table.getPageCount() > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="หน้าแรก"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="ก่อนหน้า"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 text-sm font-medium text-gray-600">
                  {pagination.pageIndex + 1} / {table.getPageCount()}
                </span>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="ถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="หน้าสุดท้าย"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ฟอร์มเพิ่ม/แก้ไข — โครง modal มาจาก components/admin/Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'แก้ไขหลักสูตร' : 'เพิ่มหลักสูตรใหม่'}
        subtitle={
          form.id
            ? 'แก้ไขรายละเอียดหลักสูตรและรายชื่อผู้เข้าอบรม'
            : 'กรอกข้อมูลหนังสือเชิญ แล้วเลือกเจ้าหน้าที่ที่เข้าร่วม'
        }
        icon={GraduationCap}
        size="full"
        tone="solid"
        badge={form.id ? `#${form.id}` : 'ใหม่'}
        hint={
          <>
            เลือกผู้เข้าอบรมจากช่องซ้าย · แนบเกียรติบัตรได้ทั้งไฟล์ pdf/png/jpg
            และลิงก์ภายนอก
          </>
        }
        error={formError || null}
        // ฟอร์มนี้มีข้อมูลที่ยังไม่บันทึก เผลอคลิกพื้นหลังแล้วหายหมดจะเสียใจ
        closeOnBackdrop={false}
        primaryAction={{
          label: form.id ? 'บันทึกการแก้ไข' : 'เพิ่มหลักสูตร',
          onClick: handleSave,
          loading: saving,
          disabled: selected.length === 0 || !form.CourseName.trim(),
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setModalOpen(false) }}
      >
        <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    เลขที่หนังสือ
                  </label>
                  <input
                    type="text"
                    value={form.AddID}
                    onChange={e => setForm({ ...form, AddID: e.target.value })}
                    placeholder="เช่น รง 0310.4/ว 1757"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    วันที่รับหนังสือ
                  </label>
                  <ThaiDatePicker
                    value={form.RDate}
                    onChange={v => setForm({ ...form, RDate: v })}
                    placeholder="เลือกวันที่รับ..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">เวลารับ</label>
                  <input
                    type="time"
                    value={form.Rtime}
                    onChange={e => setForm({ ...form, Rtime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  ชื่อหลักสูตร / เรื่อง <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.CourseName}
                  onChange={e => setForm({ ...form, CourseName: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    ชั้นความเร็ว
                  </label>
                  <select
                    value={form.Urgent}
                    onChange={e => setForm({ ...form, Urgent: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ด่วน">ด่วน</option>
                    <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    วันที่เริ่มอบรม
                  </label>
                  <ThaiDatePicker
                    value={form.TrDateFrom}
                    onChange={v =>
                      setForm(prev => ({
                        ...prev,
                        TrDateFrom: v,
                        // เลื่อนวันเริ่มไปหลังวันสิ้นสุด = ล้างวันสิ้นสุดทิ้ง ไม่ให้ค้างค่าที่ผิดช่วง
                        TrDateTo: v && prev.TrDateTo && prev.TrDateTo < v ? '' : prev.TrDateTo,
                      }))
                    }
                    placeholder="เลือกวันเริ่ม..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    วันที่สิ้นสุด
                  </label>
                  <ThaiDatePicker
                    value={form.TrDateTo}
                    onChange={v => setForm({ ...form, TrDateTo: v })}
                    minDate={form.TrDateFrom}
                    placeholder="เลือกวันสิ้นสุด..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    หน่วยงานที่จัด
                  </label>
                  <input
                    type="text"
                    list="course-orgs"
                    value={form.TrOrganization}
                    onChange={e => setForm({ ...form, TrOrganization: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                  />
                  <datalist id="course-orgs">
                    {organizations.map(o => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    สถานที่อบรม
                  </label>
                  <input
                    type="text"
                    list="course-places"
                    value={form.TrPlace}
                    onChange={e => setForm({ ...form, TrPlace: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                  />
                  <datalist id="course-places">
                    {places.map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-gray-400 mt-1">
                    ใช้กับผู้เข้าอบรมทุกคน ยกเว้นคนที่ระบุสถานที่เฉพาะไว้
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">หมายเหตุ</label>
                <textarea
                  value={form.Detail}
                  onChange={e => setForm({ ...form, Detail: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 resize-y"
                />
              </div>

              {/* ผู้เข้าอบรม */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    ผู้เข้าอบรม
                    <span className="text-sm font-normal text-gray-500">
                      (เลือกแล้ว {selected.length} คน)
                    </span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* เลือกจากรายชื่อ */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-3 bg-gray-50 border-b border-gray-100">
                      <input
                        type="text"
                        value={staffSearch}
                        onChange={e => setStaffSearch(e.target.value)}
                        placeholder="ค้นหาเจ้าหน้าที่..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                    </div>
                    <div className="overflow-y-auto max-h-64 divide-y divide-gray-50">
                      {filteredStaff.map(s => {
                        const checked = selected.some(a => a.StID === s.StID);
                        return (
                          <label
                            key={s.StID}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              checked ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStaff(s)}
                              className="w-4 h-4 accent-primary flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">
                                {s.Title || ''}
                                {s.StName}
                              </div>
                              <div className="text-[11px] text-gray-400 truncate">
                                {s.StID} · {s.DepName || '-'}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                      {filteredStaff.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-gray-400">
                          ไม่พบเจ้าหน้าที่ที่ค้นหา
                        </div>
                      )}
                    </div>
                  </div>

                  {/* รายละเอียดรายคน */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
                      รายละเอียดรายคน
                    </div>
                    <div className="overflow-y-auto max-h-64 divide-y divide-gray-50">
                      {selected.length === 0 ? (
                        <ModalEmptyState
                          icon={Users}
                          title="ยังไม่ได้เลือกผู้เข้าอบรม"
                          description="ติ๊กรายชื่อจากช่องด้านซ้าย แล้วมาระบุสถานที่หรือแนบเกียรติบัตรได้ที่นี่"
                        />
                      ) : (
                        selected.map(a => (
                          <div key={a.StID} className="px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-gray-800 truncate">
                                {a.Title || ''}
                                {a.StName || a.StID}
                              </span>
                              <button
                                onClick={() =>
                                  setSelected(prev => prev.filter(x => x.StID !== a.StID))
                                }
                                className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors flex-shrink-0"
                                title="เอาออก"
                              >
                                <X size={15} />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={a.TrPlace || ''}
                              onChange={e => updateAttendee(a.StID, 'TrPlace', e.target.value)}
                              placeholder="สถานที่เฉพาะคนนี้ (ว่าง = ตามหลักสูตร)"
                              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                            />
                            {/* เกียรติบัตร: อัปโหลดไฟล์ หรือวางลิงก์ภายนอกก็ได้
                                แสดงเป็นชิปเฉพาะไฟล์ที่อัปโหลดแล้ว ส่วนลิงก์ปล่อยให้พิมพ์ในช่องได้ตามปกติ
                                ไม่งั้นพิมพ์ตัวแรกแล้วช่องจะหายไปทันที */}
                            {isUploadedFile(a.Certificate) ? (
                              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                <Award size={13} className="text-amber-600 flex-shrink-0" />
                                <a
                                  href={certificateUrl(a.Certificate)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-amber-700 hover:underline truncate flex-1 min-w-0"
                                  title={a.Certificate ?? undefined}
                                >
                                  {a.Certificate?.split('/').pop()}
                                </a>
                                <button
                                  onClick={() => updateAttendee(a.StID, 'Certificate', '')}
                                  className="p-0.5 text-amber-400 hover:text-red-500 transition-colors flex-shrink-0"
                                  title="เอาเกียรติบัตรออก"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <label
                                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 border border-dashed rounded-lg text-[11px] font-medium transition-colors ${
                                    uploading[a.StID]
                                      ? 'border-gray-200 text-gray-400 cursor-wait'
                                      : 'border-gray-300 text-gray-500 hover:border-primary hover:text-primary cursor-pointer'
                                  }`}
                                >
                                  {uploading[a.StID] ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin" />
                                      กำลังอัปโหลด...
                                    </>
                                  ) : (
                                    <>
                                      <Upload size={13} />
                                      อัปโหลดเกียรติบัตร (pdf, png, jpg)
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept={CERT_ACCEPT}
                                    disabled={uploading[a.StID]}
                                    className="hidden"
                                    onChange={e => {
                                      const f = e.target.files?.[0];
                                      // ล้างค่า input ไว้ ไม่งั้นเลือกไฟล์เดิมซ้ำจะไม่ยิง onChange
                                      e.target.value = '';
                                      if (f) handleCertUpload(a.StID, f);
                                    }}
                                  />
                                </label>
                                <input
                                  type="url"
                                  value={a.Certificate || ''}
                                  onChange={e => updateAttendee(a.StID, 'Certificate', e.target.value)}
                                  placeholder="หรือวางลิงก์เกียรติบัตร"
                                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
      />
    </div>
  );
};

export default CourseManagement;
