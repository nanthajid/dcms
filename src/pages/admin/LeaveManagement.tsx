import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, User, Plus, X, Loader2, Info } from 'lucide-react';
import ConfirmModal from '../../components/admin/ConfirmModal';
import thLocale from '@fullcalendar/core/locales/th';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('th', th);

interface LeaveRecord {
  id: string;
  StID: string;
  StName: string;
  leave_type_id: string;
  leave_name: string;
  color: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  DepNo?: string;
}

interface Staff {
  StID: string;
  StName: string;
  DepNo?: string;
}

interface LeaveType {
  id: string;
  name: string;
  color: string;
}

const LeaveManagement: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [rawData, setRawData] = useState<LeaveRecord[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [formData, setFormData] = useState({
    StIDs: [] as string[],
    leave_type_id: ''
  });
  const [staffSearch, setStaffSearch] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  const fetchLeaves = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/leave_management.php?action=list');
      if (response.data.success) {
        setRawData(response.data.data);
        const calendarEvents = response.data.data.map((item: LeaveRecord) => ({
          id: item.id,
          title: `${item.leave_name}: ${item.StName}`,
          start: item.start_date,
          end: item.end_date,
          extendedProps: { ...item },
          backgroundColor: item.color || '#3b82f6',
          borderColor: item.color || '#2563eb'
        }));
        setEvents(calendarEvents);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลวันลาได้');
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

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/leave_types_list.php');
      if (response.data.success) {
        setLeaveTypes(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchStaffs();
    fetchLeaveTypes();
  }, []);

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

  const formatDatePickerYear = (dates: Date[]) => {
    if (dates.length === 0) return '';
    if (dates.length === 1) {
      const d = dates[0];
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`;
    }
    return `เลือกแล้ว ${dates.length} วัน`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.StIDs.length === 0 || !formData.leave_type_id || selectedDates.length === 0) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const formattedDates = selectedDates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      const response = await axios.post('/dcms/api/admin/leave_management.php?action=save', {
        ...formData,
        dates: formattedDates
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setIsModalOpen(false);
        setFormData({ StIDs: [], leave_type_id: '' });
        setSelectedDates([]);
        fetchLeaves();
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
      title: 'ยืนยันการลบข้อมูลวันลา',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/leave_management.php?action=delete', { id });
          if (response.data.success) {
            toast.success(response.data.message);
            fetchLeaves();
          }
        } catch (err) {
          toast.error('ลบข้อมูลไม่สำเร็จ');
        }
      }
    });
  };

  const handleEventDrop = async (info: any) => {
    const id = info.event.id;
    const newDate = info.event.startStr.split('T')[0];
    try {
      const response = await axios.post('/dcms/api/admin/leave_update_date.php', { id, new_date: newDate });
      if (response.data.success) {
        toast.success(`ย้ายข้อมูลการลาไปวันที่ ${newDate} สำเร็จ`);
        fetchLeaves();
      } else {
        toast.error(response.data.message);
        info.revert();
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการย้ายข้อมูล');
      info.revert();
    }
  };

  const filteredData = rawData.filter(item => {
    const parts = item.start_date.split('-');
    if (parts.length !== 3) return false;
    const itemMonth = parseInt(parts[1]);
    const itemYear = parseInt(parts[0]);
    return itemMonth === selectedMonth && itemYear === selectedYear;
  });

  const filteredStaffs = staffs.filter(s => 
    s.StName.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">จัดการข้อมูลวันลาเจ้าหน้าที่</h2>
          <p className="text-gray-500">บันทึกและตรวจสอบข้อมูลการลาพักผ่อน ลาป่วย และการลาอื่นๆ</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => { setSelectedDates([]); setFormData({ StIDs: [], leave_type_id: '' }); setStaffSearch(''); setIsModalOpen(true); }}
            className="flex-1 md:flex-none bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold shadow-md shadow-primary/20"
          >
            <Plus size={20} />
            <span>บันทึกวันลาใหม่</span>
          </button>
        </div>
      </div>

      {/* Summary Card Similar to WFH */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-blue-50 p-3 rounded-xl text-primary">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">สรุปข้อมูลเดือนนี้</h3>
              <p className="text-sm text-gray-500">เลือกเดือนที่ต้องการตรวจสอบข้อมูล</p>
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

            <div className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-bold border border-slate-200">
              พบ {filteredData.length} รายการ
            </div>
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
                บันทึกข้อมูลวันลา
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">วันที่ลา (เลือกได้หลายวัน) <span className="text-red-500">*</span></label>
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

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ประเภทการลา <span className="text-red-500">*</span></label>
                  <select
                    value={formData.leave_type_id}
                    onChange={(e) => setFormData({...formData, leave_type_id: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-white font-medium"
                  >
                    <option value="">เลือกประเภทการลา</option>
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">เจ้าหน้าที่ (เลือกได้หลายคน) <span className="text-red-500">*</span></label>
                  <div className="relative mb-3">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                      <User size={18} />
                    </span>
                    <input
                      type="text"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="ค้นหาชื่อเจ้าหน้าที่..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-sm font-medium"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-xl max-h-60 overflow-y-auto p-4 space-y-3 bg-white shadow-inner font-sarabun">
                    {filteredStaffs.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-4">ไม่พบรายชื่อเจ้าหน้าที่</p>
                    ) : (
                      filteredStaffs.map(s => (
                        <label key={s.StID} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                          <input 
                            type="checkbox"
                            checked={formData.StIDs.includes(s.StID)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, StIDs: [...formData.StIDs, s.StID]});
                              } else {
                                setFormData({...formData, StIDs: formData.StIDs.filter(id => id !== s.StID)});
                              }
                            }}
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                          />
                          <span className={`text-sm font-medium transition-colors ${formData.StIDs.includes(s.StID) ? 'text-primary' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {s.StName}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {formData.StIDs.length > 0 && (
                    <p className="mt-2 text-xs font-bold text-primary">เลือกแล้ว {formData.StIDs.length} คน</p>
                  )}
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
                  บันทึกข้อมูลวันลา
                </button>
              </div>
            </form>
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

export default LeaveManagement;
