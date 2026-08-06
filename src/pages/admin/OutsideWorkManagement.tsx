import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  Loader2, 
  FileText, 
  Trash2, 
  Settings, 
  Sparkles, 
  Clock,
  DollarSign,
  Pencil,
  ChevronUp,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { OutsideWorkSummaryPDF } from '../../components/admin/OutsideWorkSummaryPDF';
import ConfirmModal from '../../components/admin/ConfirmModal';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';

registerLocale('th', th);
interface OutsideWorkRecord {
  id: string;
  StID: string;
  StName: string;
  Title?: string;
  work_date: string;
  hours: number;
  rate: number;
  amount: number;
  reason: string;
  is_holiday: number;
  StPostName?: string;
  DepName?: string;
  DepNo?: string;
  sort_order?: string;
}

interface Staff {
  StID: string;
  StName: string;
  Title?: string;
  DepNo?: string;
  StPost?: string;
  StPostName?: string;
  PostType?: string;
}

interface Holiday {
  id: string;
  holiday_date: string;
  name: string;
}

const OutsideWorkManagement: React.FC = () => {
  const navigate = useNavigate();
  const [rawData, setRawData] = useState<OutsideWorkRecord[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({ StIDs: [] as string[] });
  const [leaveSearchTerm, setLeaveSearchTerm] = useState('');
  const [leaveDates, setLeaveDates] = useState<Date[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [formData, setFormData] = useState({
    StID: '',
    reason: ''
  });

  const [approverId, setApproverId] = useState('');
  const [approverTitle, setApproverTitle] = useState('นางสาว');
  const [approverName, setApproverName] = useState('สวลี พันธ์ศรี');
  const [approverPostName, setApproverPostName] = useState('นักวิชาการแรงงานชำนาญการพิเศษ');
  const [settings, setSettings] = useState<any>({});
  const [isEditReportModalOpen, setIsEditReportModalOpen] = useState(false);
  const [reportTitles, setReportTitles] = useState<{ id: string; title: string }[]>([]);
  const [selectedReportTitleId, setSelectedReportTitleId] = useState('1');
  const [editTitleForm, setEditTitleForm] = useState({ id: '', title: '' });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editReportData, setEditReportData] = useState({
    approverId: ''
  });
  const [isLoadingReportTitles, setIsLoadingReportTitles] = useState(false);

  const [holidayFormData, setHolidayFormData] = useState({
    holiday_date: '',
    name: ''
  });

  // ค่าเริ่มต้น ชม./อัตรา จากหน้า "จัดการค่าธรรมเนียม"
  const [rateConfig, setRateConfig] = useState({
    owr_weekday_hours: 1,
    owr_weekday_rate: 50,
    owr_saturday_hours: 7,
    owr_saturday_rate: 60,
    owr_holiday_hours: 0,
    owr_holiday_rate: 0
  });

  // แก้ไข ชม. / จำนวนเงิน รายรายการ
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [editRecord, setEditRecord] = useState<OutsideWorkRecord | null>(null);
  const [editRecordForm, setEditRecordForm] = useState({ hours: '', amount: '' });


  const [holidayDate, setHolidayDate] = useState<Date | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const daysInMonthOf = (m: number, y: number) => new Date(y, m, 0).getDate();
  const daysInSelectedMonth = daysInMonthOf(selectedMonth, selectedYear);

  // ช่วงวันที่ของรายงาน มีผลกับทั้งตาราง จำนวนรายการ และ PDF สรุป
  const [reportStartDay, setReportStartDay] = useState(1);
  const [reportEndDay, setReportEndDay] = useState(() =>
    daysInMonthOf(new Date().getMonth() + 1, new Date().getFullYear())
  );

  // ผู้ใช้เปลี่ยนเดือน/ปีเอง = รีเซ็ตช่วงเป็นทั้งเดือน
  // (ไม่ใช้ useEffect เพราะการลงเวลาอัตโนมัติตั้งเดือนพร้อมช่วงเฉพาะเจาะจงมาด้วย)
  const changeReportMonth = (month: number) => {
    setSelectedMonth(month);
    setReportStartDay(1);
    setReportEndDay(daysInMonthOf(month, selectedYear));
  };

  const changeReportYear = (year: number) => {
    setSelectedYear(year);
    setReportStartDay(1);
    setReportEndDay(daysInMonthOf(selectedMonth, year));
  };
  
  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string | React.ReactNode;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
    size: 'sm'
  });

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const fetchOutsideWork = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/dcms/api/admin/outside_work_management.php?action=list');
      if (response.data.success) {
        setRawData(response.data.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลการทำงานนอกได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffs = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/staff_list.php');
      if (response.data.success) {
        setStaffs(response.data.data);
        // Set default approver if T1 exists
        const t1Staffs = response.data.data.filter((s: Staff) => s.PostType === 'T1');
        if (t1Staffs.length > 0) {
          setApproverId(t1Staffs[0].StID);
          setApproverTitle(t1Staffs[0].Title || '');
          setApproverName(t1Staffs[0].StName);
          setApproverPostName(t1Staffs[0].StPostName || '');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/holidays_management.php?action=list');
      if (response.data.success) {
        setHolidays(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/dcms/api/get_settings.php');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReportTitles = async () => {
    setIsLoadingReportTitles(true);
    try {
      const response = await axios.get('/dcms/api/admin/report_titles_management.php?action=list');
      if (response.data.success) {
        setReportTitles(response.data.data.reportTitles);
        setSelectedReportTitleId(response.data.data.selectedReportTitleId || '1');
        if (response.data.data.approverId) {
          setApproverId(response.data.data.approverId);
          setApproverTitle(response.data.data.approverTitle || '');
          setApproverName(response.data.data.approverName || '');
          setApproverPostName(response.data.data.approverPostName || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReportTitles(false);
    }
  };


  const fetchRateConfig = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/work_rate_settings.php?action=get');
      if (response.data.success) {
        setRateConfig(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOutsideWork();
    fetchHolidays();
    fetchSettings();
    fetchRateConfig();
    (async () => {
      await fetchStaffs();
      await fetchReportTitles();
    })();
  }, []);

  useEffect(() => {
    setEditReportData(prev => ({ ...prev, approverId }));
  }, [approverId]);

  const handleAddReportTitle = async () => {
    if (!editTitleForm.title.trim()) {
      toast.error('กรุณาระบุหัวข้อรายงาน');
      return;
    }
    try {
      const response = await axios.post('/dcms/api/admin/report_titles_management.php?action=add', {
        title: editTitleForm.title
      });
      if (response.data.success) {
        setReportTitles(response.data.data.reportTitles);
        setEditTitleForm({ id: '', title: '' });
        toast.success('เพิ่มหัวข้อรายงานสำเร็จ');
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มหัวข้อรายงาน');
    }
  };

  const handleUpdateReportTitle = async () => {
    if (!editTitleForm.title.trim()) {
      toast.error('กรุณาระบุหัวข้อรายงาน');
      return;
    }
    try {
      const response = await axios.post('/dcms/api/admin/report_titles_management.php?action=update', {
        id: editTitleForm.id,
        title: editTitleForm.title
      });
      if (response.data.success) {
        setReportTitles(response.data.data.reportTitles);
        setEditTitleForm({ id: '', title: '' });
        setIsEditingTitle(false);
        toast.success('แก้ไขหัวข้อรายงานสำเร็จ');
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการแก้ไขหัวข้อรายงาน');
    }
  };

  const handleDeleteReportTitle = async (id: string) => {
    try {
      const response = await axios.post('/dcms/api/admin/report_titles_management.php?action=delete', { id });
      if (response.data.success) {
        setReportTitles(response.data.data.reportTitles);
        setSelectedReportTitleId(response.data.data.selectedReportTitleId);
        toast.success('ลบหัวข้อรายงานสำเร็จ');
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการลบหัวข้อรายงาน');
    }
  };

  const handleEditTitle = (title: { id: string; title: string }) => {
    setEditTitleForm(title);
    setIsEditingTitle(true);
  };

  const handleSelectReportTitle = async (id: string) => {
    try {
      const response = await axios.post('/dcms/api/admin/report_titles_management.php?action=select', { id });
      if (response.data.success) {
        setSelectedReportTitleId(id);
        toast.success('เลือกหัวข้อรายงานสำเร็จ');
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการเลือกหัวข้อรายงาน');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.StID || selectedDates.length === 0) {
      toast.error('กรุณาเลือกเจ้าหน้าที่และวันที่ปฏิบัติงาน');
      return;
    }

    try {
      const formattedDates = selectedDates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      const response = await axios.post('/dcms/api/admin/outside_work_management.php?action=save', {
        ...formData,
        dates: formattedDates
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setIsModalOpen(false);
        setFormData({ StID: '', reason: '' });
        setSelectedDates([]);
        fetchOutsideWork();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      open: true,
      title: 'ยืนยันการลบข้อมูล',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/outside_work_management.php?action=delete', { id });
          if (response.data.success) {
            toast.success(response.data.message);
            fetchOutsideWork();
          }
        } catch (err) {
          toast.error('ลบข้อมูลไม่สำเร็จ');
        }
      }
    });
  };

  const handleOpenEditRecord = (record: OutsideWorkRecord) => {
    setEditRecord(record);
    setEditRecordForm({
      hours: String(Number(record.hours)),
      amount: String(Number(record.amount))
    });
    setIsEditRecordModalOpen(true);
  };

  const handleCloseEditRecord = () => {
    setIsEditRecordModalOpen(false);
    setEditRecord(null);
    setEditRecordForm({ hours: '', amount: '' });
  };

  // เปลี่ยน ชม. แล้วคำนวณจำนวนเงินให้อัตโนมัติ (แก้ทับได้)
  const handleEditHoursChange = (value: string) => {
    const hours = Number(value);
    const rate = Number(editRecord?.rate ?? 0);
    setEditRecordForm(prev => ({
      ...prev,
      hours: value,
      amount: value === '' || isNaN(hours) ? prev.amount : String(hours * rate)
    }));
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;

    const hours = Number(editRecordForm.hours);
    const amount = Number(editRecordForm.amount);

    if (editRecordForm.hours === '' || isNaN(hours) || hours < 0) {
      toast.error('กรุณาระบุจำนวนชั่วโมงให้ถูกต้อง');
      return;
    }
    if (editRecordForm.amount === '' || isNaN(amount) || amount < 0) {
      toast.error('กรุณาระบุจำนวนเงินให้ถูกต้อง');
      return;
    }

    setIsSavingRecord(true);
    try {
      const response = await axios.post('/dcms/api/admin/outside_work_management.php?action=update', {
        id: editRecord.id,
        hours,
        rate: Number(editRecord.rate),
        amount
      });
      if (response.data.success) {
        toast.success(response.data.message);
        handleCloseEditRecord();
        fetchOutsideWork();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('แก้ไขข้อมูลไม่สำเร็จ');
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleSaveHoliday = async (dataToSave?: any) => {
    try {
      const payload = dataToSave || holidayFormData;
      const response = await axios.post('/dcms/api/admin/holidays_management.php?action=save', payload);
      if (response.data.success) {
        toast.success(response.data.message);
        setHolidayFormData({ holiday_date: '', name: '' });
        setHolidayDate(null);
        fetchHolidays();
      }
    } catch (err) {
      toast.error('บันทึกวันหยุดไม่สำเร็จ');
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (leaveFormData.StIDs.length === 0 || leaveDates.length === 0) {
      toast.error('กรุณาเลือกเจ้าหน้าที่และวันที่ลา');
      return;
    }
    try {
      const formattedDates = leaveDates.map(date => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      });

      for (const StID of leaveFormData.StIDs) {
        const response = await axios.post('/dcms/api/admin/leave_management.php?action=save', {
          StID,
          leave_type_id: 1,
          dates: formattedDates,
          reason: 'บันทึกจากหน้านอกเวลาราชการ'
        });
        if (!response.data.success) {
          toast.error(response.data.message);
          return;
        }
      }
      toast.success('บันทึกวันลาสำเร็จสำหรับเจ้าหน้าที่ทั้งหมด');
      setIsLeaveModalOpen(false);
      setLeaveFormData({ StIDs: [] });
      setLeaveDates([]);
      fetchOutsideWork();
    } catch {
      toast.error('เกิดข้อผิดพลาดในการบันทึกวันลา');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const response = await axios.post('/dcms/api/admin/holidays_management.php?action=delete', { id });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchHolidays();
      }
    } catch (err) {
      toast.error('ลบวันหยุดไม่สำเร็จ');
    }
  };

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const parts = item.work_date.split('-');
      const day = parseInt(parts[2]);
      return parseInt(parts[1]) === selectedMonth
        && parseInt(parts[0]) === selectedYear
        && day >= reportStartDay
        && day <= reportEndDay;
    });
  }, [rawData, selectedMonth, selectedYear, reportStartDay, reportEndDay]);

  const isPartialRange = reportStartDay !== 1 || reportEndDay !== daysInSelectedMonth;

  const handleAutoGenerate = async () => {
    const currentMonth = selectedMonth;
    const currentYear = selectedYear;

    // Fetch unique position types and departments from get_staff_options.php
    let postTypesList: { PostType: string, PostTypeName: string }[] = [];
    let departmentsList: { DepNo: string, DepName: string }[] = [];
    try {
      const response = await axios.get('/dcms/api/admin/get_staff_options.php');
      if (response.data.success) {
        if (response.data.options.post_types) postTypesList = response.data.options.post_types;
        if (response.data.options.departments) departmentsList = response.data.options.departments;
      }
    } catch (err) {
      console.error('Error fetching staff options:', err);
    }

    const t1Staffs = staffs.filter(s => s.PostType === 'T1');

    const daysIn = (m: number, y: number) => new Date(y, m, 0).getDate();

    // เดือน/ปี เปลี่ยนแล้วต้องสร้างตัวเลือกวันใหม่ (ก.พ. ไม่มีวันที่ 30/31)
    const syncDayOptions = () => {
      const monthSelect = document.getElementById('autoGenMonth') as HTMLSelectElement;
      const yearSelect = document.getElementById('autoGenYear') as HTMLSelectElement;
      const startSelect = document.getElementById('autoGenStartDay') as HTMLSelectElement;
      const endSelect = document.getElementById('autoGenEndDay') as HTMLSelectElement;
      if (!monthSelect || !yearSelect || !startSelect || !endSelect) return;

      const total = daysIn(parseInt(monthSelect.value), parseInt(yearSelect.value));

      [startSelect, endSelect].forEach((select, index) => {
        const previous = parseInt(select.value) || (index === 0 ? 1 : total);
        select.innerHTML = '';
        for (let d = 1; d <= total; d++) {
          const option = document.createElement('option');
          option.value = String(d);
          option.textContent = String(d);
          select.appendChild(option);
        }
        select.value = String(Math.min(previous, total));
      });
    };

    setConfirmModal({
      open: true,
      title: 'ยืนยันการลงเวลาอัตโนมัติ',
      message: (
        <div className="space-y-4 text-left">
          <p className="text-gray-600 font-medium">กรุณาเลือกช่วงเวลาและกลุ่มเจ้าหน้าที่ที่ต้องการลงเวลา</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">เดือน</label>
              <select
                id="autoGenMonth"
                defaultValue={currentMonth}
                onChange={syncDayOptions}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {thaiMonths.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ปี พ.ศ.</label>
              <select
                id="autoGenYear"
                defaultValue={currentYear}
                onChange={syncDayOptions}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y + 543}</option>
                })}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">ช่วงวันที่ที่ต้องการลงเวลา</label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 flex-shrink-0">ตั้งแต่วันที่</span>
              <select
                id="autoGenStartDay"
                defaultValue={1}
                className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {[...Array(daysIn(currentMonth, currentYear))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 flex-shrink-0">ถึงวันที่</span>
              <select
                id="autoGenEndDay"
                defaultValue={daysIn(currentMonth, currentYear)}
                className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {[...Array(daysIn(currentMonth, currentYear))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">* ค่าเริ่มต้นคือทั้งเดือน ปรับได้หากต้องการลงเวลาเฉพาะบางช่วง</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">เลือกประเภทตำแหน่ง</label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {postTypesList.map(pt => (
                  <label key={pt.PostType} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 hover:border-primary cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      name="postTypeOption"
                      value={pt.PostType}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                    />
                    <span className="text-xs font-medium text-gray-700">{pt.PostTypeName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">เลือกฝ่าย/กลุ่มงาน</label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {departmentsList.map(dep => (
                  <label key={dep.DepNo} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 hover:border-primary cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      name="departmentOption"
                      value={dep.DepNo}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                    />
                    <span className="text-xs font-medium text-gray-700">{dep.DepName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wider">ค่าธรรมเนียม / ชม. สำหรับรอบนี้</label>
            <p className="text-[10px] text-emerald-700 mb-3">
              มีผลเฉพาะการลงเวลารอบนี้ (เดือน/ปี และกลุ่มที่เลือกด้านบน) — ไม่กระทบค่าเริ่มต้นในเมนู "จัดการค่าธรรมเนียม"
            </p>
            <div className="space-y-2">
              {[
                { key: 'weekday', label: 'วันธรรมดา (จ.-ศ.)', hours: rateConfig.owr_weekday_hours, rate: rateConfig.owr_weekday_rate },
                { key: 'saturday', label: 'วันเสาร์', hours: rateConfig.owr_saturday_hours, rate: rateConfig.owr_saturday_rate },
                { key: 'holiday', label: 'วันอาทิตย์/วันหยุด', hours: rateConfig.owr_holiday_hours, rate: rateConfig.owr_holiday_rate },
              ].map(row => (
                <div key={row.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-xs font-medium text-gray-700">{row.label}</span>
                  <div className="flex items-center gap-1">
                    <input
                      id={`autoGen_${row.key}_hours`}
                      type="number"
                      min="0"
                      step="0.5"
                      defaultValue={Number(row.hours)}
                      className="w-16 px-2 py-1 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-xs text-right"
                    />
                    <span className="text-[10px] text-gray-500 w-6">ชม.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      id={`autoGen_${row.key}_rate`}
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={Number(row.rate)}
                      className="w-16 px-2 py-1 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-xs text-right"
                    />
                    <span className="text-[10px] text-gray-500 w-10">บาท/ชม.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">ผู้รับรองการปฏิบัติงาน (T1)</label>
            <select 
              id="approverSelect"
              defaultValue={approverId}
              className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              onChange={(e) => {
                const s = staffs.find(st => st.StID === e.target.value);
                if (s) {
                  setApproverId(s.StID);
                  setApproverTitle(s.Title || '');
                  setApproverName(s.StName);
                  setApproverPostName(s.StPostName || '');
                }
              }}
            >
              {t1Staffs.map(s => (
                <option key={s.StID} value={s.StID}>{(s.Title || '')}{s.StName} ({s.StPostName})</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-blue-600 font-medium">* จะแสดงในรายงาน PDF สรุปการเบิกเงิน</p>
          </div>

          <p className="text-[11px] text-gray-400 text-center">* หากไม่เลือก ระบบจะลงเวลาให้เจ้าหน้าที่ทุกคนตามเงื่อนไขที่เลือก</p>
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
            <Sparkles size={14} className="text-amber-500" />
            <p className="text-[11px] text-amber-700 font-medium">ระบบจะข้ามรายการที่เคยบันทึกไว้แล้วให้โดยอัตโนมัติ</p>
          </div>
        </div>
      ),
      type: 'warning',
      size: 'xl',
      onConfirm: async () => {
        const month = parseInt((document.getElementById('autoGenMonth') as HTMLSelectElement)?.value);
        const year = parseInt((document.getElementById('autoGenYear') as HTMLSelectElement)?.value);

        const totalDays = daysIn(month, year);
        const startDay = parseInt((document.getElementById('autoGenStartDay') as HTMLSelectElement)?.value) || 1;
        const endDay = parseInt((document.getElementById('autoGenEndDay') as HTMLSelectElement)?.value) || totalDays;

        if (startDay > endDay) {
          toast.error('วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด');
          return;
        }


        const ptCheckboxes = document.querySelectorAll('input[name="postTypeOption"]:checked') as NodeListOf<HTMLInputElement>;
        const selectedPostTypes = Array.from(ptCheckboxes).map(cb => cb.value);

        const depCheckboxes = document.querySelectorAll('input[name="departmentOption"]:checked') as NodeListOf<HTMLInputElement>;
        const selectedDepartments = Array.from(depCheckboxes).map(cb => cb.value);

        const appSelect = document.getElementById('approverSelect') as HTMLSelectElement;
        if (appSelect) {
          const s = staffs.find(st => st.StID === appSelect.value);
          if (s) {
            setApproverId(s.StID);
            setApproverTitle(s.Title || '');
            setApproverName(s.StName);
            setApproverPostName(s.StPostName || '');
          }
        }

        // ค่าธรรมเนียมเฉพาะรอบนี้ (ไม่บันทึกทับค่าเริ่มต้นของระบบ)
        const rates: Record<string, number> = {};
        for (const key of ['weekday', 'saturday', 'holiday']) {
          for (const field of ['hours', 'rate']) {
            const input = document.getElementById(`autoGen_${key}_${field}`) as HTMLInputElement;
            const value = Number(input?.value);
            if (!input || input.value === '' || isNaN(value) || value < 0) {
              toast.error('ค่าธรรมเนียม/ชั่วโมงต้องเป็นตัวเลขและไม่ติดลบ');
              return;
            }
            rates[`owr_${key}_${field}`] = value;
          }
        }

        setIsGenerating(true);
        try {
          const response = await axios.post('/dcms/api/admin/outside_work_management.php?action=auto_generate', {
            month,
            year,
            start_day: startDay,
            end_day: endDay,
            PostTypes: selectedPostTypes,
            Departments: selectedDepartments,
            rates
          });
          if (response.data.success) {
            toast.success(response.data.message);
            setSelectedMonth(month);
            setSelectedYear(year);
            // ให้ตารางและรายงาน PDF อ้างอิงช่วงเดียวกับที่เพิ่งลงเวลา
            setReportStartDay(startDay);
            setReportEndDay(endDay);
            fetchOutsideWork();
          } else {
            toast.error(response.data.message);
          }
        } catch (err) {
          toast.error('เกิดข้อผิดพลาดในการสร้างข้อมูลอัตโนมัติ');
        } finally {
          setIsGenerating(false);
        }
      }
    });
  };

  const handleResetMonth = () => {
    const currentMonth = selectedMonth;
    const currentYear = selectedYear;
    
    setConfirmModal({
      open: true,
      title: 'ยืนยันการล้างข้อมูลประจำเดือน',
      message: (
        <div className="space-y-4 text-left">
          <p className="text-gray-600 font-medium">
            กรุณาเลือกเดือนและปีที่ต้องการลบข้อมูลการทำงานนอกเวลา <br/>
            <span className="text-red-500 font-bold text-sm">* การกระทำนี้ไม่สามารถเรียกคืนได้</span>
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
              <label className="block text-[10px] font-bold text-red-500 mb-1 uppercase">เดือนที่ต้องการล้าง</label>
              <select 
                id="resetGenMonth"
                defaultValue={currentMonth}
                className="w-full px-2 py-1.5 bg-white border border-red-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm"
              >
                {thaiMonths.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
              <label className="block text-[10px] font-bold text-red-500 mb-1 uppercase">ปี พ.ศ.</label>
              <select 
                id="resetGenYear"
                defaultValue={currentYear}
                className="w-full px-2 py-1.5 bg-white border border-red-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm"
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y + 543}</option>
                })}
              </select>
            </div>
          </div>
        </div>
      ) as any,
      type: 'danger',
      onConfirm: async () => {
        const month = parseInt((document.getElementById('resetGenMonth') as HTMLSelectElement)?.value);
        const year = parseInt((document.getElementById('resetGenYear') as HTMLSelectElement)?.value);
        
        try {
          const response = await axios.post('/dcms/api/admin/outside_work_management.php?action=clear', {
            month,
            year
          });
          if (response.data.success) {
            toast.success(response.data.message);
            setSelectedMonth(month);
            setSelectedYear(year);
            setReportStartDay(1);
            setReportEndDay(daysInMonthOf(month, year));
            fetchOutsideWork();
          } else {
            toast.error(response.data.message);
          }
        } catch (err) {
          toast.error('ล้างข้อมูลไม่สำเร็จ');
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id);
    if (selectedIds.length === 0) return;

    setConfirmModal({
      open: true,
      title: 'ยืนยันการลบข้อมูลที่เลือก',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลที่เลือกทั้งหมดจำนวน ${selectedIds.length} รายการ?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/outside_work_management.php?action=bulk_delete', { ids: selectedIds });
          if (response.data.success) {
            toast.success(response.data.message);
            setRowSelection({});
            fetchOutsideWork();
          }
        } catch (err) {
          toast.error('ลบข้อมูลไม่สำเร็จ');
        }
      }
    });
  };

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const generateSummaryPDF = async () => {
    if (filteredData.length === 0) return;
    setIsGeneratingSummary(true);
    try {
      // Calculate days in the selected month
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

      // Transform data for Summary Report
      const groupedMap: { [key: string]: any } = {};

      filteredData.forEach(item => {
        if (!groupedMap[item.StID]) {
          groupedMap[item.StID] = {
            employeeName: (item.Title || '') + item.StName,
            rate: "50, 60", // Fixed string as requested
            otByDay: {},
            normalHours: 0,
            holidayHours: 0,
            totalAmount: 0,
            sort_order: item.sort_order
          };
        }

        const day = parseInt(item.work_date.split('-')[2]).toString();
        const hours = Number(item.hours);
        const rate = Number(item.rate);
        groupedMap[item.StID].otByDay[day] = hours;

        if (Number(item.is_holiday)) {
          groupedMap[item.StID].holidayHours += hours;
        } else {
          groupedMap[item.StID].normalHours += hours;
        }

        // Calculate total amount as sum of (hours * rate)
        groupedMap[item.StID].totalAmount += (hours * rate);
        });

      const summaryData = Object.values(groupedMap).sort((a: any, b: any) =>
        Number(a.sort_order || 999) - Number(b.sort_order || 999)
      );

      // Get the selected report title
      const selectedTitle = reportTitles.find(t => t.id === selectedReportTitleId)?.title || 'หลักฐานการเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ';

      const blob = await pdf(
        <OutsideWorkSummaryPDF
          data={summaryData}
          monthName={thaiMonths[selectedMonth - 1]}
          yearThai={selectedYear + 543}
          daysInMonth={daysInMonth}
          startDay={reportStartDay}
          endDay={reportEndDay}
          year={selectedYear}
          month={selectedMonth}
          holidays={holidays}
          approverTitle={approverTitle}
          approverName={approverName}
          approverPostName={approverPostName}
          agencyName={settings.agency_name}
          reportTitle={selectedTitle}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const rangeSuffix = isPartialRange ? `_${reportStartDay}-${reportEndDay}` : '';
      link.download = `รายงานสรุป_ค่าตอบแทนนอกเวลา_${thaiMonths[selectedMonth - 1]}${rangeSuffix}_${selectedYear + 543}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลดรายงานสรุปสำเร็จ');
    } catch (error) {
      console.error('Error generating Summary PDF:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างรายงานสรุป');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatDateThai = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const d = parseInt(parts[2]);
      return `${d} ${thaiMonths[m - 1]} ${y + 543}`;
    }
    return dateStr;
  };

  // TanStack Table Columns
  const columnHelper = createColumnHelper<OutsideWorkRecord>();
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <div className="px-1">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-1">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      ),
    }),
    columnHelper.accessor('work_date', {
      header: () => <div className="min-w-[220px]">วันที่ปฏิบัติงานนอกเวลาราชการ</div>,
      cell: info => (
        <div className="min-w-[220px] font-semibold text-blue-900 whitespace-nowrap">
          {formatDateThai(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor('StName', {
      header: 'ชื่อ-นามสกุล',
      cell: info => (
        <div>
          <div className="font-bold text-gray-800">{(info.row.original.Title || '') + info.getValue()}</div>
          <div className="text-xs text-gray-500">{info.row.original.StPostName || '-'}</div>
        </div>
      ),
    }),
    columnHelper.accessor('hours', {
      header: 'ชม.',
      cell: info => (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
            <Clock size={12} />
            {Number(info.getValue())}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('rate', {
      header: 'บาท/ชม.',
      cell: info => <div className="text-right">{Number(info.getValue())}</div>,
    }),
    columnHelper.accessor('amount', {
      header: 'จำนวนเงิน',
      cell: info => (
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">
            <DollarSign size={12} />
            {Number(info.getValue()).toLocaleString()}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('is_holiday', {
      header: 'ประเภท',
      cell: info => (
        <div className="flex justify-center">
          {Number(info.getValue()) ? (
            <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-bold">วันหยุด</span>
          ) : (
            <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-md text-[10px] font-bold">วันธรรมดา</span>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'จัดการ',
      cell: info => (
        <div className="flex justify-center gap-1">
          <button
            onClick={() => handleOpenEditRecord(info.row.original)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="แก้ไข ชม. / จำนวนเงิน"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => handleDelete(info.row.original.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="ลบรายการ"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    }),
  ], [columnHelper]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">จัดการการทำงานนอกเวลา</h2>
          <p className="text-gray-500">บันทึกและตรวจสอบตารางการปฏิบัติงานนอกเวลาราชการ</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="flex-1 md:flex-none bg-emerald-50 text-emerald-600 px-6 py-2.5 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 font-bold border border-emerald-200"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            <span>ลงเวลาอัตโนมัติ (ทุกคน)</span>
          </button>
          <button 
            onClick={handleResetMonth}
            className="flex-1 md:flex-none bg-red-50 text-red-600 px-6 py-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 font-bold border border-red-200"
          >
            <Trash2 size={20} />
            <span>ล้างข้อมูลประจำเดือน</span>
          </button>
          <button 
            onClick={() => setIsHolidayModalOpen(true)}
            className="flex-1 md:flex-none bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-bold shadow-sm"
          >
            <Settings size={20} />
            <span>ตั้งค่าวันหยุด</span>
          </button>
          <button
            onClick={() => { setLeaveDates([]); setLeaveFormData({ StIDs: [] }); setIsLeaveModalOpen(true); }}
            className="flex-1 md:flex-none bg-orange-50 text-orange-600 px-6 py-2.5 rounded-xl hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-2 font-bold border border-orange-200"
          >
            <CalendarIcon size={20} />
            <span>บันทึกวันลา</span>
          </button>
          <button
            onClick={() => navigate('/admin/outside-work-leave')}
            className="flex-1 md:flex-none bg-purple-50 text-purple-600 px-6 py-2.5 rounded-xl hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2 font-bold border border-purple-200"
          >
            <CalendarIcon size={20} />
            <span>แก้ไขวันลา</span>
          </button>
          <button
            onClick={() => {
              setEditReportData({
                approverId
              });
              setIsEditReportModalOpen(true);
            }}
            disabled={isLoadingReportTitles}
            className="flex-1 md:flex-none bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 font-bold border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingReportTitles ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
            <span>แก้ไขรายงาน</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-blue-50 p-3 rounded-xl text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">รายงานค่าตอบแทน</h3>
              <p className="text-sm text-gray-500">เลือกเดือนและช่วงวันที่ที่ต้องการส่งออก PDF</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder="ค้นหาเจ้าหน้าที่..."
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 font-medium w-full md:w-64"
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 pointer-events-none z-10">
                <CalendarIcon size={18} />
              </span>
              <DatePicker
                selected={table.getColumn('work_date')?.getFilterValue() ? new Date(table.getColumn('work_date')?.getFilterValue() as string) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    table.getColumn('work_date')?.setFilterValue(`${year}-${month}-${day}`);
                  } else {
                    table.getColumn('work_date')?.setFilterValue('');
                  }
                }}
                locale="th"
                dateFormat="dd/MM/yyyy"
                placeholderText="กรองตามวันที่..."
                isClearable
                className="pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 font-medium w-full md:w-44"
              />
            </div>

            {Object.keys(rowSelection).length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 font-bold shadow-sm"
              >
                <Trash2 size={18} />
                <span>ลบที่เลือก ({Object.keys(rowSelection).length})</span>
              </button>
            )}

            <select
              value={selectedMonth}
              onChange={(e) => changeReportMonth(parseInt(e.target.value))}
              className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 font-medium"
            >
              {thaiMonths.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => changeReportYear(parseInt(e.target.value))}
              className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 font-medium"
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return <option key={y} value={y}>{y + 543}</option>
              })}
            </select>

            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl bg-gray-50">
              <CalendarIcon size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 flex-shrink-0">วันที่</span>
              <select
                value={reportStartDay}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setReportStartDay(value);
                  if (value > reportEndDay) setReportEndDay(value);
                }}
                className="px-2 py-1 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white font-medium text-sm"
              >
                {[...Array(daysInSelectedMonth)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 flex-shrink-0">ถึง</span>
              <select
                value={reportEndDay}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setReportEndDay(value);
                  if (value < reportStartDay) setReportStartDay(value);
                }}
                className="px-2 py-1 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white font-medium text-sm"
              >
                {[...Array(daysInSelectedMonth)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              {isPartialRange && (
                <button
                  onClick={() => { setReportStartDay(1); setReportEndDay(daysInSelectedMonth); }}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="ล้างช่วงวันที่ (แสดงทั้งเดือน)"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={generateSummaryPDF}
              disabled={filteredData.length === 0 || isGeneratingSummary}
              className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold shadow-sm ${
                filteredData.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FileText size={18} />
              <span>{isGeneratingSummary ? 'กำลังเตรียม...' : `พิมพ์รายงานสรุป (${filteredData.length})`}</span>
            </button>
          </div>
        </div>

        {isPartialRange && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <CalendarIcon size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              กำลังแสดงเฉพาะวันที่ {reportStartDay} - {reportEndDay} {thaiMonths[selectedMonth - 1]} {selectedYear + 543}
              — ตาราง จำนวนรายการ และรายงาน PDF จะอ้างอิงช่วงนี้ทั้งหมด
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-100">
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id} 
                        className="px-6 py-4 text-sm font-bold text-gray-700 align-top"
                      >
                        <div 
                          className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUp size={14} />,
                            desc: <ChevronDown size={14} />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                        {header.column.id === 'work_date' && (
                          <div className="flex items-center gap-2">
                            {/* Filter moved to top section */}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-50">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400">
                      ไม่พบข้อมูลการทำงานนอกเวลาในเดือนนี้
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination UI */}
        {!loading && filteredData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>แสดงหน้า</span>
              <span className="font-bold text-gray-700">
                {table.getState().pagination.pageIndex + 1}
              </span>
              <span>จาก</span>
              <span className="font-bold text-gray-700">
                {table.getPageCount()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 transition-colors"
                title="หน้าแรก"
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 transition-colors"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 transition-colors"
                title="หน้าถัดไป"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 transition-colors"
                title="หน้าสุดท้าย"
              >
                <ChevronsRight size={18} />
              </button>

              <select
                value={table.getState().pagination.pageSize}
                onChange={e => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="ml-4 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm text-gray-700"
              >
                {[10, 20, 30, 40, 50].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    แสดง {pageSize} รายการ
                  </option>
                ))}
                <option value={filteredData.length}>แสดงทั้งหมด</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Save Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon />
                บันทึกการทำงานนอกเวลา
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">เจ้าหน้าที่ <span className="text-red-500">*</span></label>
                  <select
                    value={formData.StID}
                    onChange={(e) => setFormData({...formData, StID: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  >
                    <option value="">เลือกเจ้าหน้าที่</option>
                    {staffs.map(s => (
                      <option key={s.StID} value={s.StID}>{s.StName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">วันที่ปฏิบัติงาน (เลือกได้หลายวัน) <span className="text-red-500">*</span></label>
                  <DatePicker
                    selected={null}
                    onChange={(date: Date | null) => {
                      if (!date) return;
                      setSelectedDates(prev => {
                        const exists = prev.find(d => d.toDateString() === date.toDateString());
                        if (exists) return prev.filter(d => d.toDateString() !== date.toDateString());
                        return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
                      });
                    }}
                    highlightDates={selectedDates}
                    shouldCloseOnSelect={false}
                    placeholderText="คลิกเพื่อเลือกวัน..."
                    value={selectedDates.length > 0 ? `เลือกแล้ว ${selectedDates.length} วัน` : ''}
                    locale="th"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  />
                  {selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-40 overflow-y-auto">
                      {selectedDates.map(date => (
                        <span key={date.getTime()} className="bg-white text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-2 font-bold shadow-sm">
                          {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                          <button type="button" onClick={() => {
                            setSelectedDates(prev => prev.filter(d => d.toDateString() !== date.toDateString()));
                          }} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary min-h-[100px] font-medium resize-none"
                    placeholder="ระบุหมายเหตุ (ถ้ามี)..."
                  ></textarea>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                  <p className="font-bold mb-1">เกณฑ์การคำนวณ:</p>
                  <ul className="list-disc list-inside">
                    <li>จันทร์ - ศุกร์: {rateConfig.owr_weekday_rate} บาท/ชม. (คิด {rateConfig.owr_weekday_hours} ชม.)</li>
                    <li>เสาร์: {rateConfig.owr_saturday_rate} บาท/ชม. (คิด {rateConfig.owr_saturday_hours} ชม.)</li>
                    <li>อาทิตย์/วันหยุด: {rateConfig.owr_holiday_rate} บาท/ชม. (คิด {rateConfig.owr_holiday_hours} ชม.)</li>
                  </ul>
                  <p className="mt-2 text-xs text-blue-600">* แก้ไขได้ที่เมนู "จัดการค่าธรรมเนียม"</p>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-200">ยกเลิก</button>
                <button type="submit" className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Record Modal (ชม. / จำนวนเงิน) */}
      {isEditRecordModalOpen && editRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Pencil size={22} />
                แก้ไขข้อมูลรายการ
              </h3>
              <button onClick={handleCloseEditRecord} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="p-8 space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                <p className="font-bold text-gray-800">{(editRecord.Title || '') + editRecord.StName}</p>
                <p className="text-xs text-gray-500">{editRecord.StPostName || '-'}</p>
                <p className="text-sm text-blue-900 font-semibold pt-1">{formatDateThai(editRecord.work_date)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนชั่วโมง (ชม.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editRecordForm.hours}
                    onChange={(e) => handleEditHoursChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">อัตรา (บาท/ชม.)</label>
                  <input
                    type="number"
                    value={Number(editRecord.rate)}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRecordForm.amount}
                  onChange={(e) => setEditRecordForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium"
                />
                <p className="mt-1 text-[11px] text-gray-500">* ระบบคำนวณให้อัตโนมัติเมื่อแก้ชั่วโมง แต่แก้ไขทับได้</p>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseEditRecord}
                  className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingRecord}
                  className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingRecord && <Loader2 className="animate-spin" size={18} />}
                  <span>{isSavingRecord ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings />
                ตั้งค่าวันหยุดราชการอื่น
              </h3>
              <button onClick={() => setIsHolidayModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!holidayDate) {
                    toast.error('กรุณาเลือกวันที่');
                    return;
                  }
                  const formattedDate = `${holidayDate.getFullYear()}-${String(holidayDate.getMonth() + 1).padStart(2, '0')}-${String(holidayDate.getDate()).padStart(2, '0')}`;
                  handleSaveHoliday({...holidayFormData, holiday_date: formattedDate});
                }} 
                className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">วันที่วันหยุด</label>
                  <DatePicker
                    selected={holidayDate}
                    onChange={(date: Date | null) => setHolidayDate(date)}
                    locale="th"
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                    placeholderText="เลือกวันที่..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อวันหยุด</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={holidayFormData.name}
                      onChange={(e) => setHolidayFormData({...holidayFormData, name: e.target.value})}
                      className="flex-grow px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="เช่น วันสงกรานต์"
                      required
                    />
                    <button type="submit" className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 transition-all">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </form>

              <div className="max-h-60 overflow-y-auto space-y-2">
                <h4 className="font-bold text-gray-700 text-sm">รายการวันหยุดที่ตั้งไว้</h4>
                {holidays.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีข้อมูลวันหยุด</p>
                ) : (
                  holidays.map(h => (
                    <div key={h.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                      <div>
                        <p className="font-bold text-gray-800">{h.name}</p>
                        <p className="text-xs text-gray-500">{new Date(h.holiday_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <button onClick={() => handleDeleteHoliday(h.id)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-orange-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon size={20} />
                บันทึกวันลา
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitLeave} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">เจ้าหน้าที่ (เลือกได้หลายคน) <span className="text-red-500">*</span></label>
                {(() => {
                  const uniqueStIds = [...new Set(filteredData.map(item => item.StID))];
                  const staffWithOutsideWork = staffs.filter(s => uniqueStIds.includes(s.StID));
                  const filteredStaff = staffWithOutsideWork.filter(s =>
                    s.StName.toLowerCase().includes(leaveSearchTerm.toLowerCase())
                  );

                  return (
                    <>
                      <div className="relative mb-3">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                          <Search size={18} />
                        </span>
                        <input
                          type="text"
                          value={leaveSearchTerm}
                          onChange={(e) => setLeaveSearchTerm(e.target.value)}
                          placeholder="ค้นหารายชื่อเจ้าหน้าที่..."
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white font-medium"
                        />
                      </div>

                      <div className="border border-gray-300 rounded-xl p-4 max-h-80 overflow-y-auto space-y-2 bg-gray-50">
                        {filteredStaff.length === 0 ? (
                          <p className="text-center text-gray-400 py-4 text-sm">ไม่พบเจ้าหน้าที่ที่ตรงกัน</p>
                        ) : (
                          filteredStaff.map(s => (
                            <label key={s.StID} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 cursor-pointer transition-all">
                              <input
                                type="checkbox"
                                checked={leaveFormData.StIDs.includes(s.StID)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setLeaveFormData({ StIDs: [...leaveFormData.StIDs, s.StID] });
                                  } else {
                                    setLeaveFormData({ StIDs: leaveFormData.StIDs.filter(id => id !== s.StID) });
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <div className="flex-grow">
                                <p className="font-bold text-gray-800">{s.StName}</p>
                                <p className="text-xs text-gray-500">{s.StPostName || '-'}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>

                      {leaveFormData.StIDs.length > 0 && (
                        <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                          <p className="text-xs font-bold text-orange-700 mb-2">เลือกแล้ว ({leaveFormData.StIDs.length} คน):</p>
                          <div className="flex flex-wrap gap-2">
                            {leaveFormData.StIDs.map(stId => {
                              const staff = staffs.find(s => s.StID === stId);
                              return (
                                <span key={stId} className="bg-white text-orange-700 text-xs px-3 py-1.5 rounded-lg border border-orange-200 flex items-center gap-2 font-bold shadow-sm">
                                  {staff?.StName}
                                  <button
                                    type="button"
                                    onClick={() => setLeaveFormData({ StIDs: leaveFormData.StIDs.filter(id => id !== stId) })}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">วันที่ลา (เลือกได้หลายวัน) <span className="text-red-500">*</span></label>
                <DatePicker
                  selected={null}
                  onChange={(date: Date | null) => {
                    if (!date) return;
                    setLeaveDates(prev => {
                      const exists = prev.find(d => d.toDateString() === date.toDateString());
                      if (exists) return prev.filter(d => d.toDateString() !== date.toDateString());
                      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
                    });
                  }}
                  highlightDates={leaveDates}
                  shouldCloseOnSelect={false}
                  placeholderText="คลิกเพื่อเลือกวัน..."
                  value={leaveDates.length > 0 ? `เลือกแล้ว ${leaveDates.length} วัน` : ''}
                  locale="th"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white font-medium"
                />
                {leaveDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100 max-h-32 overflow-y-auto">
                    {leaveDates.map(date => (
                      <span key={date.getTime()} className="bg-white text-orange-700 text-xs px-3 py-1.5 rounded-lg border border-orange-200 flex items-center gap-2 font-bold shadow-sm">
                        {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        <button type="button" onClick={() => setLeaveDates(prev => prev.filter(d => d.toDateString() !== date.toDateString()))} className="text-gray-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl font-bold hover:bg-gray-100 border border-gray-200">ยกเลิก</button>
                <button type="submit" className="flex-[2] py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all">บันทึกวันลา</button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* Edit Report Modal */}
      {isEditReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText size={20} />
                แก้ไขรายงาน
              </h3>
              <button onClick={() => setIsEditReportModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow p-8 space-y-6">
              {/* Report Title Management */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-700">จัดการหัวข้อรายงาน</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitleForm({ id: '', title: '' });
                      setIsEditingTitle(false);
                    }}
                    className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold border border-blue-200 transition-all"
                  >
                    <Plus size={14} className="inline mr-1" />
                    เพิ่มหัวข้อใหม่
                  </button>
                </div>

                {/* Add/Edit Title Form */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editTitleForm.title}
                      onChange={(e) => setEditTitleForm({ ...editTitleForm, title: e.target.value })}
                      placeholder={isEditingTitle ? 'แก้ไขหัวข้อรายงาน...' : 'ระบุหัวข้อรายงานใหม่...'}
                      className="flex-1 px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                    {isEditingTitle ? (
                      <>
                        <button
                          type="button"
                          onClick={handleUpdateReportTitle}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold text-sm"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTitleForm({ id: '', title: '' });
                            setIsEditingTitle(false);
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-bold text-sm"
                        >
                          ยกเลิก
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAddReportTitle}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-sm"
                      >
                        เพิ่ม
                      </button>
                    )}
                  </div>
                </div>

                {/* Report Titles Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-3 font-bold text-gray-700">ลำดับ</th>
                        <th className="px-4 py-3 font-bold text-gray-700">หัวข้อรายงาน</th>
                        <th className="px-4 py-3 font-bold text-gray-700 text-center w-32">เลือกใช้</th>
                        <th className="px-4 py-3 font-bold text-gray-700 text-center w-24">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportTitles.map((title, idx) => (
                        <tr key={title.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-700 font-semibold">{idx + 1}</td>
                          <td className="px-4 py-3 text-gray-800">{title.title}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="radio"
                              name="reportTitle"
                              checked={selectedReportTitleId === title.id}
                              onChange={() => handleSelectReportTitle(title.id)}
                              className="w-4 h-4 text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-center flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditTitle(title)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                              title="แก้ไข"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReportTitle(title.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="ลบ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approver Selection */}
              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">ผู้รับรองการปฏิบัติงาน (T1) <span className="text-red-500">*</span></label>
                <select
                  value={editReportData.approverId}
                  onChange={(e) => setEditReportData({ ...editReportData, approverId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  required
                >
                  <option value="">เลือกผู้รับรอง</option>
                  {staffs
                    .filter(s => s.PostType === 'T1')
                    .map(s => (
                      <option key={s.StID} value={s.StID}>
                        {(s.Title || '')}{s.StName} ({s.StPostName})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">* ผู้บริหารท่านนี้จะลงนามในรายงาน PDF สรุปการเบิกเงิน</p>
              </div>

              {/* Approver Preview */}
              {editReportData.approverId && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-800 mb-2">ข้อมูลผู้รับรองที่เลือก:</p>
                  {(() => {
                    const selected = staffs.find(s => s.StID === editReportData.approverId);
                    return (
                      <div className="space-y-1">
                        <p className="text-sm text-blue-900"><span className="font-bold">ชื่อ:</span> {(selected?.Title || '')}{selected?.StName}</p>
                        <p className="text-sm text-blue-900"><span className="font-bold">ตำแหน่ง:</span> {selected?.StPostName || '-'}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-6 border-t border-gray-100 flex gap-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsEditReportModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 border border-gray-300 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const approver = staffs.find(s => s.StID === editReportData.approverId);
                  if (approver) {
                    setApproverId(approver.StID);
                    setApproverTitle(approver.Title || '');
                    setApproverName(approver.StName);
                    setApproverPostName(approver.StPostName || '');

                    try {
                      await axios.post('/dcms/api/admin/report_titles_management.php?action=save_approver', {
                        approverId: approver.StID,
                        approverTitle: approver.Title || '',
                        approverName: approver.StName,
                        approverPostName: approver.StPostName || ''
                      });
                    } catch (err) {
                      console.error(err);
                    }
                  }
                  toast.success('บันทึกการแก้ไขรายงานสำเร็จ');
                  setIsEditReportModalOpen(false);
                }}
                type="button"
                className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        size={confirmModal.title === 'ยืนยันการลงเวลาอัตโนมัติ' ? 'xl' : 'sm'}
      />
    </div>
  );
};

export default OutsideWorkManagement;
