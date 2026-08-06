import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, CheckCircle, Clock, UserCheck, Home, LogOut } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DashboardStats {
  counselors_total: number;
  appointments_today: number;
  appointments_completed: number;
  appointments_pending: number;
  staff_total: number;
  wfh_today: number;
  leave_today: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/dcms/api/admin/dashboard_stats.php');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        toast.error('ไม่สามารถโหลดข้อมูลภาพรวมได้');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'นักแนะแนวทั้งหมด', value: stats?.counselors_total || 0, icon: <Users size={24} />, color: 'bg-blue-500', link: '/admin/counselors' },
    { label: 'นัดหมายวันนี้', value: stats?.appointments_today || 0, icon: <Calendar size={24} />, color: 'bg-indigo-500', link: '/admin/appointments' },
    { label: 'นัดหมายเสร็จสิ้น', value: stats?.appointments_completed || 0, icon: <CheckCircle size={24} />, color: 'bg-emerald-500', link: '/admin/appointments' },
    { label: 'นัดหมายรอดำเนินการ', value: stats?.appointments_pending || 0, icon: <Clock size={24} />, color: 'bg-amber-500', link: '/admin/appointments' },
  ];

  const staffStats = [
    { label: 'เจ้าหน้าที่ทั้งหมด', value: stats?.staff_total || 0, icon: <UserCheck size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/staff' },
    { label: 'WFH วันนี้', value: stats?.wfh_today || 0, icon: <Home size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/admin/wfh' },
    { label: 'ลาวันนี้', value: stats?.leave_today || 0, icon: <LogOut size={20} />, color: 'text-rose-600', bg: 'bg-rose-50', link: '/admin/leave' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ (Overview)</h2>
        <p className="text-gray-500">ข้อมูลสรุปการดำเนินงานล่าสุดในระบบ AR2Home</p>
      </div>
      
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            onClick={() => navigate(stat.link)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className={`${stat.color} p-4 rounded-xl text-white shadow-lg shadow-${stat.color.split('-')[1]}-200 group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-gray-800">{loading ? '...' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Stats Row */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
          <UserCheck size={20} className="text-primary" />
          สรุปข้อมูลเจ้าหน้าที่วันนี้
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {staffStats.map((stat, index) => (
            <div 
              key={index} 
              onClick={() => navigate(stat.link)}
              className={`${stat.bg} ${stat.color} p-5 rounded-2xl border border-transparent hover:border-current transition-all cursor-pointer flex items-center justify-between group`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:rotate-12 transition-transform">
                  {stat.icon}
                </div>
                <span className="font-bold">{stat.label}</span>
              </div>
              <span className="text-2xl font-black">{loading ? '...' : stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 border-b pb-4 text-gray-800 flex items-center justify-between">
            การนัดหมายล่าสุด
            <button onClick={() => navigate('/admin/appointments')} className="text-xs text-primary font-bold hover:underline bg-blue-50 px-3 py-1 rounded-full">ดูทั้งหมด</button>
          </h3>
          <div className="text-center py-12 text-gray-400">
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium italic">ยังไม่มีข้อมูลการนัดหมายในขณะนี้</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 border-b pb-4 text-gray-800 flex items-center justify-between">
            นักแนะแนวมาใหม่
            <button onClick={() => navigate('/admin/counselors')} className="text-xs text-primary font-bold hover:underline bg-blue-50 px-3 py-1 rounded-full">ดูทั้งหมด</button>
          </h3>
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium italic">ยังไม่มีข้อมูลนักแนะแนวใหม่</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
