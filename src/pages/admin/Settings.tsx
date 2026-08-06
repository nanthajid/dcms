import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  Save, 
  Building2, 
  Loader2,
  AlertCircle,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsData {
  agency_name: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    agency_name: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/dcms/api/admin/settings_management.php?action=get');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await axios.post('/dcms/api/admin/settings_management.php?action=save', settings);
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">ตั้งค่าระบบ</h2>
          <p className="text-gray-500">จัดการข้อมูลพื้นฐานและการตั้งค่าต่างๆ ของระบบ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-slate-50 px-8 py-4 border-b border-gray-100 flex items-center gap-2">
              <Building2 size={20} className="text-primary" />
              <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">ข้อมูลหน่วยงาน</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อหน่วยงาน (Agency Name)</label>
                      <input
                        type="text"
                        value={settings.agency_name}
                        onChange={(e) => setSettings({ ...settings, agency_name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium"
                        placeholder="เช่น สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      <span>บันทึกการตั้งค่า</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
          
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-start gap-4">
            <div className="bg-white p-3 rounded-xl text-amber-600 shadow-sm">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="font-bold text-amber-800">ข้อควรระวัง</h4>
              <p className="text-sm text-amber-600 leading-relaxed mt-1">
                การเปลี่ยนชื่อหน่วยงาน จะมีผลกับรายงาน PDF และ Excel ทั้งหมดในระบบในทันที
                กรุณาตรวจสอบความถูกต้องก่อนบันทึก
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Database size={20} className="text-primary" />
              สถานะระบบ
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500 text-sm">เวอร์ชันระบบ</span>
                <span className="font-bold text-gray-800">1.2.0</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500 text-sm">การเชื่อมต่อฐานข้อมูล</span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  ออนไลน์
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-500 text-sm">อัปเดตล่าสุด</span>
                <span className="font-bold text-gray-800 text-xs">15 มิ.ย. 2569</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <SettingsIcon size={120} />
            </div>
            <h3 className="font-bold text-xl mb-2 relative z-10">คู่มือผู้ดูแลระบบ</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 relative z-10">
              หากมีปัญหาในการตั้งค่าระบบ หรือต้องการความช่วยเหลือเพิ่มเติม สามารถอ่านคู่มือการใช้งานแบบละเอียดได้ที่นี่
            </p>
            <button className="relative z-10 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold transition-all">
              เปิดอ่านคู่มือ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
