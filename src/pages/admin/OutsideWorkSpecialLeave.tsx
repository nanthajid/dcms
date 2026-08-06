import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, User, Plus, X } from 'lucide-react';
import ConfirmModal from '../../components/admin/ConfirmModal';
import thLocale from '@fullcalendar/core/locales/th';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('th', th);

interface Staff {
  StID: string;
  StName: string;
}

const OutsideWorkSpecialLeave: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [formData, setFormData] = useState({
    StIDs: [] as string[],
  });
  const [staffSearch, setStaffSearch] = useState('');

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

  const fetchLeaves = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/outside_work_special_management.php?action=list');
      if (response.data.success) {
        const leaveData = response.data.data.filter((item: any) => {
          if (Number(item.hours) !== 0) return false;
          const dayOfWeek = new Date(item.work_date).getDay();
          return dayOfWeek !== 0; // 0 = Sunday
        });
        const calendarEvents = leaveData.map((item: any) => ({
          id: item.id,
          title: `${item.StName}`,
          start: item.work_date,
          end: item.work_date,
          extendedProps: { ...item },
          backgroundColor: '#f97316',
          borderColor: '#ea580c'
        }));
        setEvents(calendarEvents);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
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

  useEffect(() => {
    fetchStaffs();
    fetchLeaves();
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
    if (formData.StIDs.length === 0 || selectedDates.length === 0) {
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

      const response = await axios.post('/dcms/api/admin/outside_work_special_management.php?action=record_leave', {
        StIDs: formData.StIDs,
        dates: formattedDates
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setIsModalOpen(false);
        setFormData({ StIDs: [] });
        setSelectedDates([]);
        fetchLeaves();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const filteredStaffs = staffs.filter(s =>
    s.StName.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">แก้ไขวันลา นอกราชการ (พิเศษ)</h2>
          <p className="text-gray-500">บันทึกและแก้ไขวันลาในรายการปฏิบัติงานนอกเวลาราชการ กรณีพิเศษ</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => { setSelectedDates([]); setFormData({ StIDs: [] }); setStaffSearch(''); setIsModalOpen(true); }}
            className="flex-1 md:flex-none bg-orange-600 text-white px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 font-bold shadow-md shadow-orange-600/20"
          >
            <Plus size={20} />
            <span>บันทึกวันลาใหม่</span>
          </button>
        </div>
      </div>


      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          locales={[thLocale]}
          locale="th"
          editable={true}
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
          eventDrop={(info) => {
            const oldDate = info.oldEvent.startStr;
            const newDate = info.event.startStr;
            const eventId = info.event.id;
            const staffName = info.event.title;
            const stID = info.event.extendedProps.StID;

            // Show confirmation modal
            setConfirmModal({
              open: true,
              title: 'ยืนยันการเปลี่ยนวันที่',
              message: `ย้ายวันลา ${staffName}\nจาก: ${oldDate}\nไป: ${newDate}`,
              type: 'warning',
              onConfirm: async () => {
                try {
                  // Delete the old leave record
                  const deleteResponse = await axios.post('/dcms/api/admin/outside_work_special_management.php?action=delete_leave', { id: eventId });

                  if (!deleteResponse.data.success) {
                    toast.error('ไม่สามารถลบวันลาเดิมได้');
                    fetchLeaves();
                    return;
                  }

                  // Create new leave record with new date (ใช้ flow ของกรณีพิเศษเท่านั้น)
                  const createResponse = await axios.post('/dcms/api/admin/outside_work_special_management.php?action=record_leave', {
                    StIDs: [stID],
                    dates: [newDate]
                  });

                  if (!createResponse.data.success) {
                    toast.error('ไม่สามารถสร้างวันลาวันใหม่ได้');
                    fetchLeaves();
                    return;
                  }

                  toast.success('อัพเดทวันที่สำเร็จ');
                  // Wait a moment for database to settle, then refetch
                  setTimeout(() => {
                    fetchLeaves();
                  }, 500);
                } catch (err) {
                  console.error('Update date error:', err);
                  toast.error('เกิดข้อผิดพลาดในการอัพเดทวันที่');
                  fetchLeaves(); // Reload to revert the change
                }
              }
            });
          }}
          eventClick={(info) => {
            const staffName = info.event.title;
            const date = info.event.startStr;
            const hours = info.event.extendedProps.hours;
            const rate = info.event.extendedProps.rate;
            const amount = info.event.extendedProps.amount;

            const message = `ลบวันลา ${staffName} วันที่ ${date}\n\nข้อมูลปัจจุบัน:\nชั่วโมง: ${hours}\nอัตรา: ${rate}\nจำนวนเงิน: ${amount}\n\nจะคืนค่าชั่วโมงให้เจ้าหน้าที่หรือไม่?`;

            setConfirmModal({
              open: true,
              title: 'ยืนยันการลบวันลา',
              message: message,
              type: 'danger',
              onConfirm: async () => {
                try {
                  const response = await axios.post('/dcms/api/admin/outside_work_special_management.php?action=delete_leave', { id: info.event.id });
                  if (response.data.success) {
                    toast.success(response.data.message);
                    fetchLeaves();
                  } else {
                    toast.error(response.data.message);
                  }
                } catch (err) {
                  toast.error('เกิดข้อผิดพลาด');
                }
              }
            });
          }}
          buttonText={{
            today: 'วันนี้',
            month: 'เดือน',
            list: 'รายการ'
          }}
          height="auto"
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-orange-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon />
                บันทึกวันลา (กรณีพิเศษ)
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-600 bg-white font-medium shadow-sm"
                    />
                  </div>
                  {selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100 max-h-40 overflow-y-auto">
                      {selectedDates.map(date => (
                        <span key={date.getTime()} className="bg-white text-orange-700 text-xs px-3 py-1.5 rounded-lg border border-orange-200 flex items-center gap-2 font-bold shadow-sm">
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-600 bg-gray-50 text-sm font-medium"
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
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-600 border-gray-300"
                          />
                          <span className={`text-sm font-medium transition-colors ${formData.StIDs.includes(s.StID) ? 'text-orange-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {s.StName}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {formData.StIDs.length > 0 && (
                    <p className="mt-2 text-xs font-bold text-orange-600">เลือกแล้ว {formData.StIDs.length} คน</p>
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
                  className="flex-[2] py-3.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                >
                  บันทึกวันลา
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

export default OutsideWorkSpecialLeave;
