import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Search, 
  Filter, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Phone,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/admin/ConfirmModal';

interface Appointment {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  counselor_id: string;
  counselor_name: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  note: string;
  created_at: string;
}

const AppointmentManagement: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
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

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/dcms/api/admin/appointment_management.php?action=list');
      if (response.data.success) {
        setAppointments(response.data.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลการนัดหมายได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await axios.post('/dcms/api/admin/appointment_management.php?action=update_status', {
        id,
        status: newStatus
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchAppointments();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'ยืนยันการลบการนัดหมาย',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนัดหมายนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/appointment_management.php?action=delete', { id });
          if (response.data.success) {
            toast.success(response.data.message);
            fetchAppointments();
          }
        } catch (err) {
          toast.error('ลบข้อมูลไม่สำเร็จ');
        }
      }
    });
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">รอการยืนยัน</span>;
      case 'confirmed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">ยืนยันแล้ว</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">เสร็จสิ้น</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold border border-rose-200">ยกเลิก</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold border border-gray-200">{status}</span>;
    }
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = 
      app.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.counselor_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">จัดการการนัดหมาย</h2>
          <p className="text-gray-500">ตรวจสอบและจัดการสถานะการนัดหมายการแนะแนว</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อนักเรียน หรือชื่อนักแนะแนว..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <Filter size={18} />
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50 appearance-none font-medium text-gray-700"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รอการยืนยัน</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
          
          <button 
            onClick={fetchAppointments}
            className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <Loader2 className={loading ? 'animate-spin' : ''} size={20} />
          </button>
        </div>
      </div>

      {/* Appointment Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-600 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4 border-b border-gray-100">วัน/เวลา นัดหมาย</th>
                <th className="px-6 py-4 border-b border-gray-100">ผู้ขอรับบริการ</th>
                <th className="px-6 py-4 border-b border-gray-100">นักแนะแนว</th>
                <th className="px-6 py-4 border-b border-gray-100">สถานะ</th>
                <th className="px-6 py-4 border-b border-gray-100 text-right">เครื่องมือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                    <p className="text-gray-400 font-medium">กำลังโหลดข้อมูลนัดหมาย...</p>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="w-10 h-10 text-gray-300" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-400">ไม่พบข้อมูลการนัดหมาย</h4>
                    <p className="text-gray-400 mt-1 italic">ยังไม่มีรายการนัดหมายในระบบ</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-primary group-hover:bg-white transition-colors">
                          <CalendarIcon size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">
                            {new Date(app.appointment_date).toLocaleDateString('th-TH', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock size={12} />
                            {app.appointment_time.substring(0, 5)} น.
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border-2 border-white">
                          {app.user_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{app.user_name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone size={12} />
                            {app.user_phone || 'ไม่ระบุเบอร์โทร'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium">{app.counselor_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {app.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(app.id, 'confirmed')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="ยืนยันการนัดหมาย"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {app.status === 'confirmed' && (
                          <button 
                            onClick={() => handleUpdateStatus(app.id, 'completed')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ทำเครื่องหมายว่าเสร็จสิ้น"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {app.status !== 'cancelled' && app.status !== 'completed' && (
                          <button 
                            onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="ยกเลิกนัดหมาย"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(app.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบข้อมูล"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      {/* Mobile Actions Dropdown or simpler buttons if space permits */}
                      <div className="md:hidden flex flex-col gap-2">
                        {/* mobile view would be handled differently but this keeps it consistent */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note/Details Sidebar or Modal can be added here if needed */}
      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="bg-white p-3 rounded-xl text-blue-600 shadow-sm">
          <MessageSquare size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-800">คำแนะนำระบบ</h4>
          <p className="text-sm text-blue-600 leading-relaxed mt-1">
            คุณสามารถยืนยัน หรือ ยกเลิกการนัดหมายได้โดยการนำเมาส์ไปชี้ที่รายการนัดหมาย 
            และเมื่อดำเนินการแนะแนวเสร็จสิ้นแล้ว ให้คลิกที่เครื่องหมายถูกเพื่อทำรายการเป็น "เสร็จสิ้น"
          </p>
        </div>
      </div>

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

export default AppointmentManagement;
