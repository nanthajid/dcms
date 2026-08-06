import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/admin/ConfirmModal';

const counselorSchema = z.object({
  fullname: z.string().min(1, 'กรุณาระบุชื่อ-นามสกุล'),
  specialty: z.string().min(1, 'กรุณาระบุความเชี่ยวชาญ'),
  education_background: z.string().optional(),
  bio: z.string().optional(),
});

interface Counselor {
  id: number;
  fullname: string;
  specialty: string;
  education_background: string;
  bio: string;
  image_url: string;
  is_active: number;
}

const CounselorManagement: React.FC = () => {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCounselor, setCurrentCounselor] = useState<Partial<Counselor>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const API_BASE_URL = '/dcms/';

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}api/admin/counselors_list.php`);
      setCounselors(response.data);
    } catch (error) {
      console.error('Error fetching counselors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounselors();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (field: keyof Counselor, value: any) => {
    setCurrentCounselor({ ...currentCounselor, [field]: value });
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const validation = counselorSchema.safeParse(currentCounselor);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const formData = new FormData();
      if (currentCounselor.id) formData.append('id', currentCounselor.id.toString());
      formData.append('fullname', currentCounselor.fullname || '');
      formData.append('specialty', currentCounselor.specialty || '');
      formData.append('education_background', currentCounselor.education_background || '');
      formData.append('bio', currentCounselor.bio || '');
      formData.append('is_active', (currentCounselor.is_active || 0).toString());
      formData.append('image_url', currentCounselor.image_url || '');
      
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const response = await axios.post(`${API_BASE_URL}api/admin/counselors_save.php`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setIsModalOpen(false);
        fetchCounselors();
      } else {
        setMessage({ text: response.data.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      open: true,
      title: 'ยืนยันการลบข้อมูล',
      message: 'คุณต้องการลบข้อมูลนักแนะแนวท่านนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      onConfirm: async () => {
        try {
          const response = await axios.post(`${API_BASE_URL}api/admin/counselors_delete.php`, { id });
          if (response.data.success) {
            toast.success(response.data.message);
            fetchCounselors();
          }
        } catch (error) {
          console.error('Error deleting:', error);
          toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
      }
    });
  };

  const openModal = (counselor?: Counselor) => {
    setCurrentCounselor(counselor || { fullname: '', specialty: '', education_background: '', bio: '', image_url: '', is_active: 1 });
    setFormErrors({});
    setSelectedFile(null);
    setImagePreview(counselor?.image_url ? (counselor.image_url.startsWith('http') ? counselor.image_url : API_BASE_URL + counselor.image_url) : null);
    setIsModalOpen(true);
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">จัดการข้อมูลนักแนะแนว</h2>
        <button
          onClick={() => openModal()}
          className="bg-white border border-primary text-primary px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm font-medium"
        >
          <Plus size={20} /> เพิ่มนักแนะแนวใหม่
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          <AlertCircle size={20} />
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">รูปภาพ</th>
              <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">ชื่อ-นามสกุล</th>
              <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">ความเชี่ยวชาญ</th>
              <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider text-center">สถานะ</th>
              <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>
            ) : counselors.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400">ยังไม่มีข้อมูลนักแนะแนว</td></tr>
            ) : (
              counselors.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <img 
                      src={item.image_url ? (item.image_url.startsWith('http') ? item.image_url : API_BASE_URL + item.image_url) : 'https://via.placeholder.com/150'} 
                      alt="" 
                      className="w-12 h-12 rounded-full object-cover border" 
                    />
                  </td>
                  <td className="p-4 font-medium text-gray-800">{item.fullname}</td>
                  <td className="p-4 text-gray-600">{item.specialty}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {item.is_active ? 'ใช้งานอยู่' : 'ปิดการใช้งาน'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openModal(item)} className="p-2 text-blue-600 border border-transparent hover:border-blue-200 hover:bg-blue-50 rounded-lg transition-all" title="แก้ไข"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg transition-all" title="ลบ"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">{currentCounselor.id ? 'แก้ไขข้อมูลนักแนะแนว' : 'เพิ่มนักแนะแนวใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="relative group">
                  <img 
                    src={imagePreview || 'https://via.placeholder.com/150'} 
                    alt="Preview" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-lg"
                  />
                  <label className="absolute bottom-0 right-0 bg-white border border-primary text-primary p-2 rounded-full cursor-pointer shadow-md hover:bg-primary hover:text-white transition-all">
                    <Plus size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">คลิกที่ปุ่มเพื่อเปลี่ยนรูปโปรไฟล์</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={currentCounselor.fullname || ''}
                  onChange={(e) => handleInputChange('fullname', e.target.value)}
                  className={`w-full p-2.5 border ${formErrors.fullname ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`}
                />
                {formErrors.fullname && <p className="text-red-500 text-xs mt-1">{formErrors.fullname}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ความเชี่ยวชาญ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={currentCounselor.specialty || ''}
                  onChange={(e) => handleInputChange('specialty', e.target.value)}
                  className={`w-full p-2.5 border ${formErrors.specialty ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`}
                />
                {formErrors.specialty && <p className="text-red-500 text-xs mt-1">{formErrors.specialty}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประวัติการศึกษา</label>
                <textarea
                  rows={2}
                  value={currentCounselor.education_background || ''}
                  onChange={(e) => handleInputChange('education_background', e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="เช่น ปริญญาตรี จิตวิทยา มหาวิทยาลัย..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประวัติย่อ</label>
                <textarea
                  rows={3}
                  value={currentCounselor.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                ></textarea>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={Boolean(currentCounselor.is_active)}
                  onChange={(e) => handleInputChange('is_active', e.target.checked ? 1 : 0)}
                  className="w-4 h-4 text-primary"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">เปิดใช้งาน (แสดงผลหน้าเว็บ)</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-white border border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save size={18} /> บันทึกข้อมูล
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

export default CounselorManagement;
