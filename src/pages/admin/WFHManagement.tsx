import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, User, Plus, X, Loader2, FileText, Sparkles, Trash2 } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { WFHReportPDF } from '../../components/admin/WFHReportPDF';
import ConfirmModal from '../../components/admin/ConfirmModal';
import thLocale from '@fullcalendar/core/locales/th';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('th', th);

interface WFHRecord {
  id: string;
  StID: string;
  StName: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  DepNo?: string;
}

interface Staff {
  StID: string;
  StName: string;
  PostType?: string;
  DepNo?: string;
}

const WFHManagement: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [rawData, setRawData] = useState<WFHRecord[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [formData, setFormData] = useState({
    StID: '',
    reason: ''
  });
  const [settings, setSettings] = useState<any>({ agency_name: 'สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒', director_post_id: 'P12' });

  // Monthly Report & Selection State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Auto Generate State
  const [autoMonth, setAutoMonth] = useState(new Date().getMonth() + 1);
  const [autoYear, setAutoYear] = useState(new Date().getFullYear());

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // Get WFH count for a staff in a specific month
  const getMonthlyQuota = (stID: string, month: number, year: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return rawData.filter(item => 
      item.StID === stID && 
      item.start_date.startsWith(monthStr)
    ).length;
  };

  const getQuotaColor = (count: number) => {
    if (count === 0) return 'text-emerald-600';
    if (count < 3) return 'text-amber-600';
    return 'text-red-600';
  };

  // Filter eligible staff (Not T1)
  const eligibleStaffs = staffs.filter(s => s.PostType !== 'T1');

  // Department Color Mapping
  const getDeptColor = (depNo?: string) => {
    const cleanDepNo = (depNo || '').trim();
    const colors: Record<string, { bg: string, border: string }> = {
      '1': { bg: '#3b82f6', border: '#2563eb' },
      '01': { bg: '#3b82f6', border: '#2563eb' },
      '2': { bg: '#10b981', border: '#059669' },
      '02': { bg: '#10b981', border: '#059669' },
      '3': { bg: '#f59e0b', border: '#d97706' },
      '03': { bg: '#f59e0b', border: '#d97706' },
      '4': { bg: '#8b5cf6', border: '#7c3aed' },
      '04': { bg: '#8b5cf6', border: '#7c3aed' },
      '5': { bg: '#ef4444', border: '#dc2626' },
      '05': { bg: '#ef4444', border: '#dc2626' },
      '6': { bg: '#ec4899', border: '#db2777' },
      '06': { bg: '#ec4899', border: '#db2777' },
      '7': { bg: '#06b6d4', border: '#0891b2' },
      '07': { bg: '#06b6d4', border: '#0891b2' },
      '8': { bg: '#f97316', border: '#ea580c' },
      '08': { bg: '#f97316', border: '#ea580c' },
      '9': { bg: '#64748b', border: '#475569' },
      '09': { bg: '#64748b', border: '#475569' },
    };
    return colors[cleanDepNo] || { bg: '#3b82f6', border: '#2563eb' };
  };

  const filteredData = rawData.filter(item => {
    const parts = item.start_date.split('-');
    if (parts.length !== 3) return false;
    const itemMonth = parseInt(parts[1]);
    const itemYear = parseInt(parts[0]);
    return itemMonth === selectedMonth && itemYear === selectedYear;
  });

  const formatDatePickerYear = (dates: Date[]) => {
    if (dates.length === 0) return '';
    if (dates.length === 1) {
      const d = dates[0];
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`;
    }
    return `เลือกแล้ว ${dates.length} วัน`;
  };

  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    setSelectedDates(prev => {
      const exists = prev.find(d => d.toDateString() === date.toDateString());
      if (exists) {
        return prev.filter(d => d.toDateString() !== date.toDateString());
      } else {
        return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
      }
    });
  };

  const fetchWFH = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/wfh_management.php?action=list');
      if (response.data.success) {
        setRawData(response.data.data);
        const calendarEvents = response.data.data.map((item: WFHRecord) => {
          const colors = getDeptColor(item.DepNo);
          return {
            id: item.id,
            title: `WFH: ${item.StName || item.StID}`,
            start: item.start_date,
            end: item.end_date,
            extendedProps: { ...item },
            backgroundColor: colors.bg,
            borderColor: colors.border
          };
        });
        setEvents(calendarEvents);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูล WFH ได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffs = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/staff_list.php');
      if (response.data.success) {
        setStaffs(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/settings_management.php?action=get');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    fetchWFH();
    fetchStaffs();
    fetchSettings();
  }, []);

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post('/dcms/api/admin/wfh_auto_generate.php', {
        month: autoMonth,
        year: autoYear
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setIsAutoModalOpen(false);
        fetchWFH();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการสุ่มวันปฏิบัติงาน');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDateClick = (arg: any) => {
    const clickedDate = new Date(arg.dateStr);
    setSelectedDates(prev => {
      const exists = prev.find(d => d.toDateString() === clickedDate.toDateString());
      if (exists) return prev;
      return [...prev, clickedDate].sort((a, b) => a.getTime() - b.getTime());
    });
    setIsModalOpen(true);
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

      const response = await axios.post('/dcms/api/admin/wfh_management.php?action=save', {
        ...formData,
        dates: formattedDates
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setIsModalOpen(false);
        setFormData({ StID: '', reason: '' });
        setSelectedDates([]);
        fetchWFH();
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
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการ WFH นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/wfh_management.php?action=delete', { id });
          if (response.data.success) {
            toast.success(response.data.message);
            fetchWFH();
          }
        } catch (err) {
          toast.error('ลบข้อมูลไม่สำเร็จ');
        }
      }
    });
  };

  const handleClearWFH = async () => {
    const monthThai = thaiMonths[selectedMonth - 1];
    const yearThai = selectedYear + 543;
    
    setConfirmModal({
      open: true,
      title: 'ยืนยันการล้างข้อมูลทั้งหมด',
      message: `คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูล WFH ทั้งหมดของเดือน ${monthThai} ${yearThai}? ข้อมูลทั้งหมดในเดือนนี้จะถูกลบถาวร`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/wfh_management.php?action=clear', {
            month: selectedMonth,
            year: selectedYear
          });
          if (response.data.success) {
            toast.success(response.data.message);
            fetchWFH();
          } else {
            toast.error(response.data.message);
          }
        } catch (err) {
          toast.error('เกิดข้อผิดพลาดในการล้างข้อมูล');
        }
      }
    });
  };

  const handleEventDrop = async (info: any) => {
    const id = info.event.id;
    const newDate = info.event.startStr.split('T')[0];
    try {
      const response = await axios.post('/dcms/api/admin/wfh_update_date.php', { id, new_date: newDate });
      if (response.data.success) {
        toast.success(`ย้าย ${info.event.extendedProps.StName} ไปวันที่ ${newDate} สำเร็จ`);
        fetchWFH();
      } else {
        toast.error(response.data.message);
        info.revert();
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการย้ายข้อมูล');
      info.revert();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">จัดการการทำงานที่บ้าน (WFH)</h2>
          <p className="text-gray-500">บันทึกและตรวจสอบตารางการทำงานนอกสถานที่ของเจ้าหน้าที่</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsAutoModalOpen(true)}
            disabled={isGenerating}
            className="flex-1 md:flex-none bg-emerald-50 text-emerald-600 px-6 py-2.5 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 font-bold border border-emerald-200"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            <span>จัดตารางอัตโนมัติ</span>
          </button>
          <button 
            onClick={() => { setSelectedDates([]); setFormData({ StID: '', reason: '' }); setIsModalOpen(true); }}
            className="flex-1 md:flex-none bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold shadow-md shadow-primary/20"
          >
            <Plus size={20} />
            <span>บันทึก WFH ใหม่</span>
          </button>
        </div>
      </div>

      {/* Monthly Report Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-blue-50 p-3 rounded-xl text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">รายงานประจำเดือน</h3>
              <p className="text-sm text-gray-500">เลือกเดือนที่ต้องการออกรายงาน PDF</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 font-medium"
            >
              {thaiMonths.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 font-medium"
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return <option key={y} value={y}>{y + 543}</option>
              })}
            </select>

            <PDFDownloadLink
              key={`${selectedMonth}-${selectedYear}-${filteredData.length}`}
              document={
                <WFHReportPDF 
                  data={filteredData} 
                  monthName={thaiMonths[selectedMonth - 1]} 
                  yearThai={selectedYear + 543}
                  directorName={staffs.find(s => (s as any).StPost === settings.director_post_id)?.StName || ''}
                />
              }
              fileName={`รายงาน_WFH_${thaiMonths[selectedMonth - 1]}_${selectedYear + 543}.pdf`}
              className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold shadow-sm ${
                filteredData.length > 0 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {({ loading }) => (
                <>
                  <FileText size={18} />
                  <span>{loading ? 'กำลังเตรียม...' : `ส่งออก PDF (${filteredData.length})`}</span>
                </>
              )}
            </PDFDownloadLink>

            {filteredData.length > 0 && (
              <button
                onClick={handleClearWFH}
                className="px-6 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-all flex items-center gap-2 font-bold shadow-sm"
                title="ล้างข้อมูลทั้งหมดของเดือนนี้"
              >
                <Trash2 size={18} />
                <span>ล้างข้อมูล WFH</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            locales={[thLocale]}
            locale="th"
            editable={true}
            eventStartEditable={true}
            eventDurationEditable={false}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,listMonth'
            }}
            titleFormat={(date: any) => {
              const d = date.date.marker;
              const month = new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(d);
              const year = d.getFullYear() + 543;
              return `${month} ${year}`;
            }}
            events={events}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            eventClick={(info) => {
              handleDelete(info.event.id);
            }}
            buttonText={{
              today: 'วันนี้',
              month: 'เดือน',
              list: 'รายการ'
            }}
            height="auto"
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon />
                บันทึกการทำงานที่บ้าน (WFH)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">เจ้าหน้าที่ <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                        <User size={18} />
                      </span>
                      <select
                        value={formData.StID}
                        onChange={(e) => setFormData({...formData, StID: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none bg-white font-medium"
                      >
                        <option value="">เลือกเจ้าหน้าที่</option>
                        {eligibleStaffs.map(s => {
                          const quota = getMonthlyQuota(s.StID, new Date().getMonth() + 1, new Date().getFullYear());
                          return (
                            <option key={s.StID} value={s.StID} className={getQuotaColor(quota)}>
                              {s.StName} (ใช้ไปแล้ว {quota}/3 วัน)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">วันที่ปฏิบัติงาน (เลือกได้หลายวัน) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none z-10">
                        <CalendarIcon size={18} />
                      </span>
                      <DatePicker
                        selected={null}
                        onChange={handleDateChange}
                        highlightDates={selectedDates}
                        shouldCloseOnSelect={false}
                        placeholderText="คลิกเพื่อเลือกวัน..."
                        value={formatDatePickerYear(selectedDates)}
                        locale="th"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-white font-medium shadow-sm"
                      />
                    </div>
                    {selectedDates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 max-h-40 overflow-y-auto">
                        {selectedDates.map(date => (
                          <span key={date.getTime()} className="bg-white text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-2 font-bold shadow-sm">
                            {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            <button type="button" onClick={() => handleDateChange(date)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุ / งานที่ได้รับมอบหมาย</label>
                  <div className="relative">
                    <span className="absolute top-4 left-3 text-gray-400 pointer-events-none">
                      <FileText size={18} />
                    </span>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary min-h-[250px] font-medium resize-none"
                      placeholder="ระบุรายละเอียดงานที่ได้รับมอบหมาย..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-gray-50 text-gray-500 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  บันทึกข้อมูล WFH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAutoModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles />
                จัดตารางอัตโนมัติ
              </h3>
              <button onClick={() => setIsAutoModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800 text-sm">
                <p className="font-bold mb-1">คำแนะนำ:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ระบบจะสุ่มวันที่ (จันทร์-ศุกร์)</li>
                  <li>สุ่มให้เฉพาะเจ้าหน้าที่ที่มีโควตายังไม่ครบ 3 วัน</li>
                  <li>จะสุ่มให้จนครบคนละ 3 วันในเดือนที่เลือก</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">เลือกเดือน <span className="text-red-500">*</span></label>
                  <select 
                    value={autoMonth}
                    onChange={(e) => setAutoMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  >
                    {thaiMonths.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">เลือกปี <span className="text-red-500">*</span></label>
                  <select 
                    value={autoYear}
                    onChange={(e) => setAutoYear(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  >
                    {[...Array(5)].map((_, i) => {
                      const y = new Date().getFullYear() - 1 + i;
                      return <option key={y} value={y}>{y + 543}</option>
                    })}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsAutoModalOpen(false)}
                  className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAutoGenerate}
                  disabled={isGenerating}
                  className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  เริ่มจัดตารางอัตโนมัติ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
};

export default WFHManagement;
