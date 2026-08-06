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

const OutsideWorkLeave: React.FC = () => {
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
    message: string | React.ReactNode;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const [hoursToRestore, setHoursToRestore] = useState<number>(8);

  const fetchLeaves = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/outside_work_management.php?action=list');
      if (response.data.success) {
        const leaveData = response.data.data.filter((item: any) => {
          if (Number(item.hours) !== 0) return false;
          const dayOfWeek = new Date(item.work_date).getDay();
          return dayOfWeek !== 0; // 0 = Sunday
        });
        console.log('Fetched leave data:', leaveData);
        const calendarEvents = leaveData.map((item: any) => ({
          id: item.id,
          title: `${item.StName || 'Unknown'}`,
          start: item.work_date,
          end: item.work_date,
          extendedProps: { ...item, StID: item.StID, StName: item.StName },
          backgroundColor: '#3b82f6',
          borderColor: '#1d4ed8'
        }));
        console.log('Calendar events:', calendarEvents);
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

      for (const StID of formData.StIDs) {
        const response = await axios.post('/dcms/api/admin/leave_management.php?action=save', {
          StID,
          leave_type_id: 1,
          dates: formattedDates,
          reason: 'บันทึกจากหน้าแก้ไขวันลา'
        });
        if (!response.data.success) {
          toast.error(response.data.message);
          return;
        }
      }
      toast.success('บันทึกวันลาสำเร็จ');
      setIsModalOpen(false);
      setFormData({ StIDs: [] });
      setSelectedDates([]);
      fetchLeaves();
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
          <h2 className="text-2xl font-bold text-gray-800">แก้ไขวันลา</h2>
          <p className="text-gray-500">บันทึกและแก้ไขวันลาในรายการปฏิบัติงานนอกเวลาราชการ</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => { setSelectedDates([]); setFormData({ StIDs: [] }); setStaffSearch(''); setIsModalOpen(true); }}
            className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 font-bold shadow-md shadow-blue-600/20"
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
                  const deleteResponse = await axios.post('/dcms/api/admin/outside_work_management.php?action=delete', { id: eventId });

                  if (!deleteResponse.data.success) {
                    toast.error('ไม่สามารถลบวันลาเดิมได้');
                    fetchLeaves();
                    return;
                  }

                  // Create new leave record with new date using leave_management API
                  const createResponse = await axios.post('/dcms/api/admin/leave_management.php?action=save', {
                    StID: stID,
                    leave_type_id: 1,
                    dates: [newDate],
                    reason: 'ย้ายวันลา'
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
            const stID = info.event.extendedProps.StID;

            const message = (
              <div className="space-y-4 text-left">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="font-bold text-red-800">ลบวันลา</p>
                  <p className="text-sm text-red-700 mt-1">{staffName} เมื่อวันที่ {date}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 font-bold mb-2">ข้อมูลปัจจุบัน:</p>
                  <div className="space-y-1 text-xs text-gray-700">
                    <p>• ชั่วโมง: {hours}</p>
                    <p>• อัตรา: {rate} บาท/ชม.</p>
                    <p>• จำนวนเงิน: {amount} บาท</p>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <label className="block text-xs font-bold text-blue-800 mb-2">ระบุชั่วโมงที่จะคืนให้เจ้าหน้าที่:</label>
                  <input
                    type="number"
                    value={hoursToRestore}
                    onChange={(e) => setHoursToRestore(Math.max(0, parseFloat(e.target.value) || 0))}
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="ระบุชั่วโมง"
                  />
                  <p className="text-xs text-blue-600 mt-1">* หากไม่ต้องการคืน ให้ใส่ 0</p>
                </div>
              </div>
            );

            setConfirmModal({
              open: true,
              title: 'ยืนยันการลบวันลา',
              message: message,
              type: 'danger',
              onConfirm: async () => {
                try {
                  // Delete the leave record first
                  const deleteResponse = await axios.post('/dcms/api/admin/outside_work_management.php?action=delete', { id: info.event.id });

                  if (!deleteResponse.data.success) {
                    toast.error(deleteResponse.data.message);
                    return;
                  }

                  // If hours > 0, create a new record to restore the hours
                  if (hoursToRestore > 0) {
                    // Format date to YYYY-MM-DD
                    const dateStr = Array.isArray(date) ? date[0] : date;

                    const createResponse = await axios.post('/dcms/api/admin/outside_work_management.php?action=save', {
                      StID: stID,
                      reason: 'คืนชั่วโมงจากการลบวันลา',
                      dates: [dateStr]
                    });

                    if (!createResponse.data.success) {
                      console.error('Restore hours error:', createResponse.data);
                      toast.error(`ลบวันลาสำเร็จ แต่ไม่สามารถคืนชั่วโมงได้: ${createResponse.data.message || 'Unknown error'}`);
                      fetchLeaves();
                      return;
                    }
                  }

                  toast.success(hoursToRestore > 0 ? 'ลบวันลาและคืนชั่วโมงสำเร็จ' : 'ลบวันลาสำเร็จ');
                  setHoursToRestore(8); // Reset to default
                  fetchLeaves();
                } catch (err) {
                  console.error('Delete/Restore error:', err);
                  toast.error('เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown'));
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
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon />
                บันทึกวันลา
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-medium shadow-sm"
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-sm font-medium"
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
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 border-gray-300"
                          />
                          <span className={`text-sm font-medium transition-colors ${formData.StIDs.includes(s.StID) ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {s.StName}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {formData.StIDs.length > 0 && (
                    <p className="mt-2 text-xs font-bold text-blue-600">เลือกแล้ว {formData.StIDs.length} คน</p>
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
                  className="flex-[2] py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
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

export default OutsideWorkLeave;
