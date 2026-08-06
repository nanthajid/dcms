import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Coins,
  Save,
  Loader2,
  RotateCcw,
  Clock,
  DollarSign,
  CalendarDays,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/admin/ConfirmModal';

interface RateConfig {
  owr_weekday_hours: number;
  owr_weekday_rate: number;
  owr_saturday_hours: number;
  owr_saturday_rate: number;
  owr_holiday_hours: number;
  owr_holiday_rate: number;
}

type RateForm = Record<keyof RateConfig, string>;

const emptyForm: RateForm = {
  owr_weekday_hours: '',
  owr_weekday_rate: '',
  owr_saturday_hours: '',
  owr_saturday_rate: '',
  owr_holiday_hours: '',
  owr_holiday_rate: ''
};

const dayGroups: {
  key: 'weekday' | 'saturday' | 'holiday';
  label: string;
  hint: string;
  hoursKey: keyof RateConfig;
  rateKey: keyof RateConfig;
  accent: string;
  badge: string;
}[] = [
  {
    key: 'weekday',
    label: 'วันธรรมดา',
    hint: 'จันทร์ - ศุกร์ (ที่ไม่ใช่วันหยุดนักขัตฤกษ์)',
    hoursKey: 'owr_weekday_hours',
    rateKey: 'owr_weekday_rate',
    accent: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-100'
  },
  {
    key: 'saturday',
    label: 'วันเสาร์',
    hint: 'วันเสาร์ที่ไม่ใช่วันหยุดนักขัตฤกษ์',
    hoursKey: 'owr_saturday_hours',
    rateKey: 'owr_saturday_rate',
    accent: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700 border-amber-100'
  },
  {
    key: 'holiday',
    label: 'วันอาทิตย์ / วันหยุดนักขัตฤกษ์',
    hint: 'รวมวันหยุดที่ตั้งไว้ในหน้า "ตั้งค่าวันหยุด"',
    hoursKey: 'owr_holiday_hours',
    rateKey: 'owr_holiday_rate',
    accent: 'text-red-600',
    badge: 'bg-red-50 text-red-700 border-red-100'
  }
];

const WorkRateSettings: React.FC = () => {
  const [form, setForm] = useState<RateForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const applyConfig = (config: RateConfig) => {
    setForm({
      owr_weekday_hours: String(Number(config.owr_weekday_hours)),
      owr_weekday_rate: String(Number(config.owr_weekday_rate)),
      owr_saturday_hours: String(Number(config.owr_saturday_hours)),
      owr_saturday_rate: String(Number(config.owr_saturday_rate)),
      owr_holiday_hours: String(Number(config.owr_holiday_hours)),
      owr_holiday_rate: String(Number(config.owr_holiday_rate))
    });
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/dcms/api/admin/work_rate_settings.php?action=get');
      if (response.data.success) {
        applyConfig(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดค่าธรรมเนียมได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (key: keyof RateConfig, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Record<string, number> = {};
    for (const key of Object.keys(form) as (keyof RateConfig)[]) {
      const value = Number(form[key]);
      if (form[key] === '' || isNaN(value) || value < 0) {
        toast.error('กรุณากรอกตัวเลขให้ครบทุกช่อง และต้องไม่ติดลบ');
        return;
      }
      payload[key] = value;
    }

    setIsSaving(true);
    try {
      const response = await axios.post('/dcms/api/admin/work_rate_settings.php?action=save', payload);
      if (response.data.success) {
        toast.success(response.data.message);
        applyConfig(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const response = await axios.post('/dcms/api/admin/work_rate_settings.php?action=reset');
      if (response.data.success) {
        toast.success(response.data.message);
        applyConfig(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('คืนค่าเริ่มต้นไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">จัดการค่าธรรมเนียม</h2>
          <p className="text-gray-500">กำหนดจำนวนชั่วโมงและอัตราค่าตอบแทนเริ่มต้น สำหรับการปฏิบัติงานนอกเวลาราชการ</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={loading || isSaving}
          className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 font-medium disabled:opacity-50"
        >
          <RotateCcw size={18} />
          <span>คืนค่าเริ่มต้นของระบบ</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-slate-50 px-8 py-4 border-b border-gray-100 flex items-center gap-2">
              <Coins size={20} className="text-primary" />
              <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">อัตราตามประเภทวัน</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : (
                <>
                  {dayGroups.map(group => {
                    const hours = Number(form[group.hoursKey]) || 0;
                    const rate = Number(form[group.rateKey]) || 0;

                    return (
                      <div key={group.key} className="p-5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={18} className={group.accent} />
                            <div>
                              <p className="font-bold text-gray-800">{group.label}</p>
                              <p className="text-xs text-gray-500">{group.hint}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${group.badge}`}>
                            รวม {(hours * rate).toLocaleString()} บาท/วัน
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                              <Clock size={14} className="text-gray-400" />
                              จำนวนชั่วโมง (ชม.)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={form[group.hoursKey]}
                              onChange={(e) => handleChange(group.hoursKey, e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium bg-white"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                              <DollarSign size={14} className="text-gray-400" />
                              อัตรา (บาท/ชม.)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={form[group.rateKey]}
                              onChange={(e) => handleChange(group.rateKey, e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกค่าธรรมเนียม'}</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-blue-600" />
              <h4 className="font-bold text-blue-900">ค่านี้ใช้ตอนไหน</h4>
            </div>
            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
              <li>ปุ่ม "ลงเวลาอัตโนมัติ (ทุกคน)" ในหน้าปฏิบัติงานนอกเวลาราชการ</li>
              <li>การบันทึกวันปฏิบัติงานรายบุคคล</li>
              <li>การลงเวลาอัตโนมัติของกรณีพิเศษ</li>
              <li>การคืนค่าชั่วโมงเมื่อย้ายวันลา</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-gray-800 mb-3">ข้อควรทราบ</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              การแก้ไขค่าที่นี่จะมีผลกับ<strong className="text-gray-800">รายการที่สร้างขึ้นใหม่</strong>เท่านั้น
              รายการที่บันทึกไว้แล้วจะยังใช้ค่าเดิม หากต้องการปรับย้อนหลัง
              ให้แก้รายรายการที่หน้าปฏิบัติงานนอกเวลาราชการ หรือล้างข้อมูลประจำเดือนแล้วลงเวลาอัตโนมัติใหม่
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-gray-800 mb-3">ค่าเริ่มต้นของระบบ</h4>
            <div className="text-sm text-gray-600 space-y-1.5">
              <div className="flex justify-between"><span>วันธรรมดา</span><span className="font-medium text-gray-800">1 ชม. × 50 บาท</span></div>
              <div className="flex justify-between"><span>วันเสาร์</span><span className="font-medium text-gray-800">7 ชม. × 60 บาท</span></div>
              <div className="flex justify-between"><span>วันอาทิตย์/วันหยุด</span><span className="font-medium text-gray-800">0 ชม. × 0 บาท</span></div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="คืนค่าเริ่มต้นของระบบ"
        message="ค่าธรรมเนียมทั้งหมดจะถูกตั้งกลับเป็นค่าเริ่มต้น (วันธรรมดา 1 ชม. × 50 บาท, วันเสาร์ 7 ชม. × 60 บาท, วันอาทิตย์/วันหยุด 0) ยืนยันหรือไม่?"
        type="warning"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          handleReset();
        }}
      />
    </div>
  );
};

export default WorkRateSettings;
