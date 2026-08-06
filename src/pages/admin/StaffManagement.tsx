import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserCircle, Briefcase, Building2, User, Loader2, AlertCircle, X, Plus, Settings, Eye, EyeOff, FileDown, GripVertical, Users, Landmark, ClipboardList, Wallet, Headset, Wrench, BookOpen, IdCard, Tag, VenusAndMars, Layers, AtSign, KeyRound, Camera, Save, RotateCcw, ShieldCheck, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import ConfirmModal from '../../components/admin/ConfirmModal';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MENU_CATALOG,
  SUBMENU_CATALOG,
  ACTION_CATALOG,
  isActionAllowed,
  isMenuAllowed,
  DEFAULT_PERMISSIONS,
  DEFAULT_NEW_TYPE_MENU_KEYS,
  SUPERUSER_TYPE,
  type MenuPermissions,
  type UserTypeOption
} from '../../config/menuAccess';

/** ไอคอนประจำสิทธิ์ระดับปุ่ม ให้ตรงกับปุ่มจริงในหน้า จะได้เทียบง่ายตอนติ๊ก */
const ACTION_ICONS: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  'staff.edit': { Icon: Wrench, color: 'text-blue-400' },
  'staff.delete': { Icon: Trash2, color: 'text-red-400' },
  'staff.export': { Icon: FileDown, color: 'text-emerald-500' },
  'staff.create': { Icon: Plus, color: 'text-primary' },
  'staff.departments': { Icon: Settings, color: 'text-slate-500' },
  'staff.usertypes': { Icon: ShieldCheck, color: 'text-amber-500' },
};

const staffSchema = z.object({
  StID: z.string().min(1, 'กรุณาระบุรหัสเจ้าหน้าที่'),
  StName: z.string().min(1, 'กรุณาระบุชื่อ-นามสกุล'),
  TitleNo: z.string().min(1, 'กรุณาเลือกคำนำหน้า'),
  SexNo: z.string().min(1, 'กรุณาเลือกเพศ'),
  StPost: z.string().min(1, 'กรุณาเลือกตำแหน่ง'),
  DepNo: z.string().min(1, 'กรุณาเลือกฝ่าย/แผนก'),
});

interface Staff {
  StID: string;
  StName: string;
  image: string;
  TitleNo: string;
  SexNo: string;
  StPost: string;
  DepNo: string;
  sort_order?: number;
  PostType: string;
  PostTypeName?: string;
  Title: string;
  SexName: string;
  StPostName: string;
  DepName: string;
  username?: string;
  password?: string;
  user_type?: string;
}

interface FormOptions {
  titles: { TitleNo: string; Title: string }[];
  sex: { SexNo: string; SexName: string }[];
  departments: { DepNo: string; DepName: string }[];
  positions: { StPost: string; StPostName: string; PostType?: string; PostTypeName?: string }[];
  post_types?: { PostType: string; PostTypeName: string }[];
  nextStID?: string;
  nextStPost?: string;
  nextPostType?: string;
}

interface SortableStaffCardProps {
  staff: Staff;
  getDeptColor: (depNo: string) => any;
  getImageUrl: (path: string) => string;
  handleViewClick: (staff: Staff) => void;
  handleEditClick: (staff: Staff) => void;
  handleDeleteClick: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const SortableStaffCard: React.FC<SortableStaffCardProps> = ({
  staff,
  getDeptColor,
  getImageUrl,
  handleViewClick,
  handleEditClick,
  handleDeleteClick,
  canEdit,
  canDelete
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: staff.StID });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = getDeptColor(staff.DepNo);
  const [isDownloading, setIsDownloading] = useState(false);

  // ดาวน์โหลดไฟล์รูปต้นฉบับ (ที่แสดงในการ์ดถูกย่อด้วย CSS เท่านั้น ไฟล์จริงยังเป็นขนาดเดิม)
  const handleDownloadImage = async () => {
    if (!staff.image || staff.image.trim() === '') {
      toast.error('เจ้าหน้าที่ท่านนี้ยังไม่มีรูป');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(getImageUrl(staff.image));
      if (!response.ok) throw new Error('ไม่พบไฟล์รูป');

      const blob = await response.blob();
      const extension = (staff.image.split('.').pop() || 'jpg').split('?')[0];
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${staff.StID}_${staff.StName}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      toast.success('บันทึกรูปเรียบร้อย');
    } catch (err) {
      toast.error('ดาวน์โหลดรูปไม่สำเร็จ');
    } finally {
      setIsDownloading(false);
    }
  };

  const getPostTypeColor = (type?: string) => {
    switch (type) {
      case 'T1': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'T2': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'T3': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'T4': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'T5': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group relative ${isDragging ? 'ring-2 ring-primary shadow-xl' : ''}`}
    >
      <div className="h-2 bg-primary"></div>
      
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-4 right-4 p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-primary hover:bg-white cursor-grab active:cursor-grabbing transition-all border border-gray-100 shadow-sm"
        title="ลากเพื่อย้ายตำแหน่ง"
      >
        <GripVertical size={20} />
      </div>

      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="relative">
              <img
                src={getImageUrl(staff.image)}
                alt={staff.StName}
                className="w-20 h-20 rounded-xl object-cover border-2 border-gray-50"
              />
              <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-lg shadow-sm border border-gray-50">
                <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="w-20 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[11px] font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="บันทึกรูปขนาดจริง"
            >
              {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>บันทึกรูป</span>
            </button>
          </div>
          <div className="flex-grow pr-8">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              {staff.StID}
            </span>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1 mt-1">
              {staff.Title}{staff.StName}
            </h3>
            {staff.PostTypeName && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter mt-1 inline-block border ${getPostTypeColor(staff.PostType)}`}>
                {staff.PostTypeName}
              </span>
            )}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span>{staff.StPostName || 'ไม่ระบุตำแหน่ง'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{staff.DepName || 'ไม่ระบุฝ่าย'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t border-gray-50 mt-2">
                <User className="w-4 h-4" />
                <span className="text-xs">{staff.SexName}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex gap-2">
          <button 
            onClick={() => handleViewClick(staff)}
            className="flex-grow py-2 px-3 bg-white border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            ดูข้อมูล
          </button>
          {canEdit && (
            <button
              onClick={() => handleEditClick(staff)}
              className="flex-grow py-2 px-3 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              แก้ไข
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteClick(staff.StID)}
              className="py-2 px-3 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              ลบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StaffManagement: React.FC = () => {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

  // สิทธิ์เข้าหน้านี้อิงจากสิทธิ์เมนู 'staff' ที่ตั้งไว้ ไม่ใช่เช็ค admin ตรง ๆ อีกแล้ว
  // รอให้โหลดสิทธิ์เสร็จก่อนค่อยตัดสิน ไม่งั้นจะเด้งออกทุกครั้งที่ยังโหลดไม่เสร็จ
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState({
    StID: '',
    StName: '',
    SexNo: '',
    TitleNo: '',
    StPost: '',
    DepNo: '',
    PostType: '',
    username: '',
    password: '',
    user_type: 'staff',
    existingImage: ''
  });
  // จัดการ user_type: แท็บสิทธิ์เมนู + แท็บเปลี่ยนประเภทรายคน
  const [userTypeModal, setUserTypeModal] = useState<{ open: boolean; tab: 'permissions' | 'users' }>({
    open: false,
    tab: 'permissions'
  });
  const [permissions, setPermissions] = useState<MenuPermissions>(DEFAULT_PERMISSIONS);
  const [userTypes, setUserTypes] = useState<UserTypeOption[]>([]);
  const [userTypeDraft, setUserTypeDraft] = useState<Record<string, string>>({});
  const [userTypeSearch, setUserTypeSearch] = useState('');
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isSavingUserType, setIsSavingUserType] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({ code: '', name: '' });
  const [isAddingType, setIsAddingType] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Add Master Data State
  const [quickAddModal, setQuickAddModal] = useState<{
    open: boolean;
    type: 'position' | 'department' | 'postType' | null;
    id: string;
    name: string;
    postType: string; // used when adding position
  }>({ open: false, type: null, id: '', name: '', postType: '' });
  const [quickAddErrors, setQuickAddErrors] = useState<{id?: string, name?: string}>({});

  // Manage Master Data State
  const [manageModal, setManageModal] = useState<{
    open: boolean;
    type: 'position' | 'department' | 'postType' | null;
  }>({ open: false, type: null });

  // View Staff Modal State
  const [viewModal, setViewModal] = useState<{
    open: boolean;
    staff: Staff | null;
  }>({ open: false, staff: null });

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

  const [activeTab, setActiveTab] = useState('ALL');

  const handleExportExcel = () => {
    if (staffs.length === 0) {
      toast.error('ไม่มีข้อมูลให้ส่งออก');
      return;
    }

    // Prepare data
    const headers = ['รหัสเจ้าหน้าที่', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'เพศ', 'ประเภทตำแหน่ง', 'ตำแหน่ง', 'ฝ่าย/แผนก', 'ชื่อผู้ใช้งาน'];
    const rows = staffs.map(s => [
      s.StID,
      s.Title,
      s.StName,
      s.SexName,
      s.PostTypeName || '',
      s.StPostName || '',
      s.DepName || '',
      s.username || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM for Thai characters in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ข้อมูลเจ้าหน้าที่_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('ส่งออกข้อมูลสำเร็จ');
  };

  const handleViewClick = (staff: Staff) => {
    setViewModal({ open: true, staff });
  };

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = staffs.findIndex((i) => i.StID === active.id);
      const newIndex = staffs.findIndex((i) => i.StID === over.id);
      
      const newOrderedStaffs = arrayMove(staffs, oldIndex, newIndex);
      setStaffs(newOrderedStaffs);
      
      // Prepare list of IDs in new order for the backend
      // We send all IDs in the new order to ensure consistency
      const orderedIds = newOrderedStaffs.map(s => s.StID);

      // Update backend
      updateOrderOnBackend(orderedIds);
    }
  };

  const updateOrderOnBackend = async (orderedIds: string[]) => {
    try {
      const response = await axios.post('/dcms/api/admin/staff_update_order.php', { orderedIds });
      if (response.data.success) {
        toast.success('จัดลำดับใหม่สำเร็จแล้วครับ');
      } else {
        toast.error(response.data.message || 'เกิดข้อผิดพลาดในการบันทึกลำดับใหม่');
        fetchStaffs();
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกลำดับใหม่');
      fetchStaffs(); // Revert to server state on error
    }
  };

  const fetchStaffs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/dcms/api/admin/staff_list.php');
      if (response.data.success) {
        setStaffs(response.data.data);
      } else {
        setError(response.data.message || 'ไม่สามารถดึงข้อมูลเจ้าหน้าที่ได้');
        toast.error(response.data.message || 'ไม่สามารถดึงข้อมูลเจ้าหน้าที่ได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/get_staff_options.php');
      if (response.data.success) {
        setOptions(response.data.options);
      }
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  useEffect(() => {
    fetchStaffs();
    fetchOptions();
    // โหลดประเภทผู้ใช้งานไว้ล่วงหน้า เพราะฟอร์มเพิ่ม/แก้ไขเจ้าหน้าที่ใช้เป็นตัวเลือก
    fetchUserTypeData().catch(() => { /* ใช้ประเภทพื้นฐานไปก่อน */ });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (value === 'ADD_NEW') {
      if (name === 'StPost') {
        const nextPostId = options?.nextStPost || '';
        setQuickAddModal({ open: true, type: 'position', id: nextPostId, name: '', postType: formData.PostType });
        setQuickAddErrors({});
      } else if (name === 'DepNo') {
        setQuickAddModal({ open: true, type: 'department', id: '', name: '', postType: '' });
        setQuickAddErrors({});
      } else if (name === 'PostType') {
        const nextId = options?.nextPostType || '';
        setQuickAddModal({ open: true, type: 'postType', id: nextId, name: '', postType: '' });
        setQuickAddErrors({});
      }
      return;
    }

    if (value === 'MANAGE_MASTER') {
      if (name === 'StPost') {
        setManageModal({ open: true, type: 'position' });
      } else if (name === 'DepNo') {
        setManageModal({ open: true, type: 'department' });
      } else if (name === 'PostType') {
        setManageModal({ open: true, type: 'postType' });
      }
      // Reset dropdown selection
      setFormData(prev => ({ ...prev, [name]: '' }));
      return;
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-sync StID to Username only when creating NEW staff
      if (!isEditMode && name === 'StID') {
        newData.username = value;
        newData.password = value;
      }

      // If PostType changes, reset StPost
      if (name === 'PostType') {
        newData.StPost = '';
      }
      
      return newData;
    });

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleEditClick = (staff: Staff) => {
    setFormData({
      StID: staff.StID,
      StName: staff.StName,
      TitleNo: (staff.TitleNo || '').trim(),
      SexNo: (staff.SexNo || '').trim(),
      StPost: (staff.StPost || '').trim(),
      DepNo: (staff.DepNo || '').trim(),
      PostType: (staff.PostType || '').trim(),
      username: staff.username || staff.StID,
      password: '', // Keep empty for security
      // ต้องคงประเภทเดิมไว้ ไม่งั้นเปิดแก้ไขคนที่เป็นประเภทอื่น (เช่น manager) แล้วบันทึกจะโดนลดเป็น staff
      user_type: staff.user_type || 'staff',
      existingImage: staff.image || ''
    });
    
    setFormErrors({});
    setImagePreview(getImageUrl(staff.image));
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'ยืนยันการลบข้อมูล',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลเจ้าหน้าที่ท่านนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/staff_delete.php', { StID: id });
          if (response.data.success) {
            toast.success(response.data.message);
            fetchStaffs();
          } else {
            toast.error(response.data.message);
          }
        } catch (err) {
          toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
      }
    });
  };

  const handleMasterDelete = (type: 'position' | 'department' | 'postType', id: string) => {
    setConfirmModal({
      open: true,
      title: `ยืนยันการลบ${type === 'position' ? 'ตำแหน่ง' : type === 'department' ? 'ฝ่าย' : 'ประเภทตำแหน่ง'}`,
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบ${type === 'position' ? 'ตำแหน่ง' : type === 'department' ? 'ฝ่าย' : 'ประเภทตำแหน่ง'}นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้ และต้องไม่มีข้อมูลอื่นใช้งานรายการนี้อยู่`,
      type: 'danger',
      onConfirm: async () => {
        try {
          let endpoint = '';
          let payload = {};
          
          if (type === 'position') {
            endpoint = '/dcms/api/admin/position_delete.php';
            payload = { StPost: id };
          } else if (type === 'department') {
            endpoint = '/dcms/api/admin/department_delete.php';
            payload = { DepNo: id };
          } else {
            endpoint = '/dcms/api/admin/post_type_delete.php';
            payload = { PostType: id };
          }
          
          const response = await axios.post(endpoint, payload);
          
          if (response.data.success) {
            toast.success(response.data.message);
            fetchOptions();
            if (type === 'position' && formData.StPost === id) setFormData(prev => ({ ...prev, StPost: '' }));
            if (type === 'department' && formData.DepNo === id) setFormData(prev => ({ ...prev, DepNo: '' }));
            if (type === 'postType' && formData.PostType === id) setFormData(prev => ({ ...prev, PostType: '' }));
          } else {
            toast.error(response.data.message);
          }
        } catch (err) {
          toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
      }
    });
  };

  const handleResetPassword = () => {
    setConfirmModal({
      open: true,
      title: 'ยืนยันการรีเซ็ตรหัสผ่าน',
      message: `คุณต้องการรีเซ็ตรหัสผ่านของเจ้าหน้าที่ท่านนี้เป็น "${formData.StID}" ใช่หรือไม่?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/user_password_reset.php', { StID: formData.StID });
          if (response.data.success) {
            toast.success(response.data.message);
          } else {
            toast.error(response.data.message);
          }
        } catch (err) {
          toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
      }
    });
  };

  const validateQuickAdd = () => {
    const errors: {id?: string, name?: string} = {};
    if (!quickAddModal.id.trim()) errors.id = 'กรุณาระบุรหัส';
    if (!quickAddModal.name.trim()) errors.name = 'กรุณาระบุชื่อ';
    setQuickAddErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateQuickAdd()) return;

    const { type, id, name, postType } = quickAddModal;
    
    try {
      let endpoint = '';
      let payload = {};
      
      if (type === 'position') {
        endpoint = '/dcms/api/admin/position_save.php';
        payload = { StPost: id, StPostName: name, PostType: postType };
      } else if (type === 'department') {
        endpoint = '/dcms/api/admin/department_save.php';
        payload = { DepNo: id, DepName: name };
      } else if (type === 'postType') {
        endpoint = '/dcms/api/admin/post_type_save.php';
        payload = { PostType: id, PostTypeName: name };
      }

      const res = await axios.post(endpoint, payload);
      if (res.data.success) {
        toast.success(res.data.message);
        await fetchOptions();
        
        if (type === 'postType' && !manageModal.open) {
          // If we added a new PostType from the position form
          setQuickAddModal(prev => ({ 
            ...prev, 
            open: true, 
            type: 'position', 
            postType: id 
          }));
        } else {
          if (!manageModal.open) {
            setFormData(prev => ({ 
              ...prev, 
              [type === 'position' ? 'StPost' : type === 'department' ? 'DepNo' : 'PostType']: id 
            }));
          }
          setQuickAddModal({ open: false, type: null, id: '', name: '', postType: '' });
        }
        setQuickAddErrors({});
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Zod Validation
    const validation = staffSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    // Additional Validation for Username/Password
    if (!formData.username) {
      toast.error('กรุณาระบุชื่อผู้ใช้งาน');
      return;
    }
    if (!isEditMode && !formData.password) {
      toast.error('กรุณาระบุรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);

    const submitData = new FormData();
    // Don't send PostType to backend if it's not in the table
    const { PostType, ...dataToSubmit } = formData;
    Object.entries(dataToSubmit).forEach(([key, value]) => {
      submitData.append(key, value);
    });
    if (imageFile) {
      submitData.append('image', imageFile);
    }

    const endpoint = isEditMode ? '/dcms/api/admin/staff_update.php' : '/dcms/api/admin/staff_save.php';

    try {
      const response = await axios.post(endpoint, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data.success) {
        toast.success(isEditMode ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ');
        setIsModalOpen(false);
        await fetchOptions(); // Refresh options to get the next StID
        resetForm();
        fetchStaffs();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const nextId = options?.nextStID || '';
    setFormData({
      StID: nextId,
      StName: '',
      SexNo: '',
      TitleNo: '',
      StPost: '',
      DepNo: '',
      PostType: '',
      username: nextId,
      password: nextId,
      user_type: 'staff',
      existingImage: ''
    });
    setFormErrors({});
    setImageFile(null);
    setImagePreview(null);
    setIsEditMode(false);
    setShowPassword(false);
  };

  // ---- จัดการ user_type + สิทธิ์การเข้าถึงเมนู ----
  const fetchUserTypeData = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/user_type_permissions.php?action=get');
      if (response.data.success) {
        setUserTypes(response.data.data.types);
        setPermissions(response.data.data.permissions);
      }
    } finally {
      // ตั้งเสมอแม้โหลดพลาด เพื่อให้ guard ทำงานด้วยค่าเริ่มต้น (เข้มกว่า ปลอดภัยกว่าปล่อยผ่าน)
      setPermissionsLoaded(true);
    }
  };

  const openUserTypeModal = async () => {
    setUserTypeModal({ open: true, tab: 'permissions' });
    setIsLoadingPermissions(true);
    try {
      await fetchUserTypeData();
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลประเภทผู้ใช้งานได้');
    } finally {
      setIsLoadingPermissions(false);
    }

    // สแนปช็อต user_type ปัจจุบันไว้แก้ในโมดัล
    const map: Record<string, string> = {};
    staffs.forEach(s => { map[s.StID] = s.user_type || 'staff'; });
    setUserTypeDraft(map);
  };

  const toggleTypeMenu = (typeCode: string, menuKey: string) => {
    setPermissions(prev => {
      const current = prev[typeCode] || [];
      const childKeys = (SUBMENU_CATALOG[menuKey] || []).map(c => c.key);

      if (current.includes(menuKey)) {
        // ปิดเมนูแม่ = ปิดเมนูย่อยทั้งหมดด้วย ไม่งั้นจะเหลือสิทธิ์ค้างที่กดไม่ถึง
        const removing = [menuKey, ...childKeys];
        let next = current.filter(k => !removing.includes(k));

        // ปิดเมนูย่อยตัวสุดท้าย = ปิดเมนูแม่ด้วย
        // (สถานะ "แม่เปิด ลูกปิดหมด" ต้องเกิดไม่ได้ ไม่งั้นชนกับ auto-fill ของข้อมูลเก่าฝั่ง PHP)
        const parentKey = Object.keys(SUBMENU_CATALOG).find(p =>
          SUBMENU_CATALOG[p].some(c => c.key === menuKey)
        );
        if (parentKey) {
          const siblings = SUBMENU_CATALOG[parentKey].map(c => c.key);
          if (!next.some(k => siblings.includes(k))) {
            next = next.filter(k => k !== parentKey);
          }
        }

        return { ...prev, [typeCode]: next };
      }

      return { ...prev, [typeCode]: [...current, menuKey] };
    });
  };

  const handleSavePermissions = async () => {
    setIsSavingUserType(true);
    try {
      const response = await axios.post('/dcms/api/admin/user_type_permissions.php?action=save', {
        permissions
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setPermissions(response.data.data.permissions);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('บันทึกสิทธิ์ไม่สำเร็จ');
    } finally {
      setIsSavingUserType(false);
    }
  };

  const handleAddUserType = async () => {
    const code = newTypeForm.code.trim().toLowerCase();
    const name = newTypeForm.name.trim();

    if (!code || !name) {
      toast.error('กรุณาระบุรหัสและชื่อประเภทผู้ใช้งาน');
      return;
    }
    if (!/^[a-z][a-z0-9_]{1,29}$/.test(code)) {
      toast.error('รหัสต้องเป็น a-z, 0-9 หรือ _ ขึ้นต้นด้วยตัวอักษร ความยาว 2-30 ตัว');
      return;
    }

    setIsAddingType(true);
    try {
      const response = await axios.post('/dcms/api/admin/user_type_permissions.php?action=add_type', { code, name });
      if (response.data.success) {
        toast.success(response.data.message);
        setUserTypes(response.data.data.types);
        setPermissions(response.data.data.permissions);
        setNewTypeForm({ code: '', name: '' });
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('เพิ่มประเภทผู้ใช้งานไม่สำเร็จ');
    } finally {
      setIsAddingType(false);
    }
  };

  const handleDeleteUserType = (type: UserTypeOption) => {
    setConfirmModal({
      open: true,
      title: 'ยืนยันการลบประเภทผู้ใช้งาน',
      message: `ต้องการลบประเภท "${type.name}" (${type.code}) ใช่หรือไม่? สิทธิ์การเข้าถึงของประเภทนี้จะถูกลบไปด้วย`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await axios.post('/dcms/api/admin/user_type_permissions.php?action=delete_type', { code: type.code });
          if (response.data.success) {
            toast.success(response.data.message);
            setUserTypes(response.data.data.types);
            setPermissions(response.data.data.permissions);
          } else {
            toast.error(response.data.message);
          }
        } catch (err) {
          toast.error('ลบประเภทผู้ใช้งานไม่สำเร็จ');
        }
      }
    });
  };

  const handleSaveUserTypes = async () => {
    const changed = staffs
      .filter(s => {
        const current = s.user_type || 'staff';
        return userTypeDraft[s.StID] && userTypeDraft[s.StID] !== current;
      })
      .map(s => ({ StID: s.StID, user_type: userTypeDraft[s.StID] }));

    if (changed.length === 0) {
      toast('ไม่มีรายการที่เปลี่ยนแปลง');
      return;
    }

    setIsSavingUserType(true);
    try {
      const response = await axios.post('/dcms/api/admin/user_type_permissions.php?action=update_user_types', {
        users: changed
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchStaffs();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('บันทึกประเภทผู้ใช้งานไม่สำเร็จ');
    } finally {
      setIsSavingUserType(false);
    }
  };

  // ประเภทที่ให้เลือกในฟอร์มเจ้าหน้าที่/โมดัล อิงจาก DB ถ้าโหลดไม่ได้ใช้ 2 ประเภทพื้นฐาน
  const availableUserTypes: UserTypeOption[] = userTypes.length > 0 ? userTypes : [
    { code: 'staff', name: 'เจ้าหน้าที่', is_system: true },
    { code: SUPERUSER_TYPE, name: 'ผู้ดูแลระบบ', is_system: true }
  ];

  const canEditStaff = isActionAllowed('staff.edit', adminUser.user_type, permissions);
  const canDeleteStaff = isActionAllowed('staff.delete', adminUser.user_type, permissions);
  const canExportStaff = isActionAllowed('staff.export', adminUser.user_type, permissions);
  const canCreateStaff = isActionAllowed('staff.create', adminUser.user_type, permissions);
  const canManageDepartments = isActionAllowed('staff.departments', adminUser.user_type, permissions);
  const canManageUserTypes = isActionAllowed('staff.usertypes', adminUser.user_type, permissions);

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (!isMenuAllowed('staff', adminUser.user_type, permissions)) {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
      navigate('/admin/dashboard');
    }
  }, [permissionsLoaded, permissions, adminUser.user_type, navigate]);

  const getDeptColor = (depNo: string) => {
    // icon + iconColor ใช้แสดงบนแท็บฝ่าย ให้แยกความต่างได้ทั้งสีและรูป
    const palette = [
      { bg: 'bg-blue-600', text: 'text-white', light: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400', icon: Building2, iconColor: 'text-blue-600' },
      { bg: 'bg-emerald-600', text: 'text-white', light: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400', icon: Briefcase, iconColor: 'text-emerald-600' },
      { bg: 'bg-violet-600', text: 'text-white', light: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-400', icon: Landmark, iconColor: 'text-violet-600' },
      { bg: 'bg-amber-600', text: 'text-white', light: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', icon: ClipboardList, iconColor: 'text-amber-600' },
      { bg: 'bg-rose-600', text: 'text-white', light: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-400', icon: Headset, iconColor: 'text-rose-600' },
      { bg: 'bg-cyan-600', text: 'text-white', light: 'bg-cyan-50', border: 'border-cyan-200', dot: 'bg-cyan-400', icon: Wallet, iconColor: 'text-cyan-600' },
      { bg: 'bg-orange-600', text: 'text-white', light: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400', icon: Wrench, iconColor: 'text-orange-600' },
      { bg: 'bg-indigo-600', text: 'text-white', light: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-400', icon: BookOpen, iconColor: 'text-indigo-600' },
    ];

    if (!depNo || depNo === 'ALL') {
      return { bg: 'bg-primary', text: 'text-white', light: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-primary', icon: Users, iconColor: 'text-primary' };
    }

    const index = depNo.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % palette.length;
    return palette[index];
  };

  const getImageUrl = (path: string) => {
    if (!path || path.trim() === '') return '/dcms/api/images/logo.png';
    if (path.startsWith('http')) return path;
    // ใช้ /dcms/ นำหน้าเพื่อให้ Vite Proxy ส่งต่อไปยัง PHP Backend ได้ถูกต้อง
    return `/dcms/${path}`;
  };

  // Filter positions based on selected PostType
  const filteredPositions = options?.positions.filter(p => !formData.PostType || p.PostType === formData.PostType) || [];

  // Filter staff by department tab
  const displayedStaffs = activeTab === 'ALL' 
    ? staffs 
    : staffs.filter(s => s.DepNo === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">จัดการข้อมูลเจ้าหน้าที่</h2>
          <p className="text-gray-500">จัดการข้อมูลเจ้าหน้าที่และบุคลากรในระบบ ({staffs.length} ท่าน)</p>
        </div>
        <div className="flex gap-2">
          {canExportStaff && (
            <button
              onClick={handleExportExcel}
              className="bg-white border border-emerald-600 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-medium"
            >
              <FileDown size={18} />
              <span>ส่งออก Excel</span>
            </button>
          )}
          {canCreateStaff && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-white border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 font-medium"
            >
              <Plus size={18} />
              <span>เพิ่มเจ้าหน้าที่ใหม่</span>
            </button>
          )}
          {canManageDepartments && (
            <button
              onClick={() => setManageModal({ open: true, type: 'department' })}
              className="bg-white border border-slate-700 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 hover:text-white transition-all shadow-sm flex items-center gap-2 font-medium"
            >
              <Settings size={18} />
              <span>จัดการฝ่าย/แผนก</span>
            </button>
          )}
          {canManageUserTypes && (
            <button
              onClick={openUserTypeModal}
              className="bg-white border border-amber-600 text-amber-600 px-4 py-2 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-medium"
            >
              <ShieldCheck size={18} />
              <span>จัดการ user_type</span>
            </button>
          )}
        </div>
      </div>

      {/* Department Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-100 flex flex-wrap gap-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'ALL' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Users size={16} className={activeTab === 'ALL' ? 'text-white' : 'text-primary'} />
          <span>ทั้งหมด ({staffs.length})</span>
        </button>
        {options?.departments.map(dep => {
          const count = staffs.filter(s => s.DepNo === dep.DepNo).length;
          const colors = getDeptColor(dep.DepNo);
          const isActive = activeTab === dep.DepNo;
          const DeptIcon = colors.icon;

          return (
            <button
              key={dep.DepNo}
              onClick={() => setActiveTab(dep.DepNo)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? `${colors.bg} ${colors.text} shadow-md`
                  : `text-gray-500 hover:${colors.light} hover:text-gray-900`
              }`}
            >
              <DeptIcon size={16} className={isActive ? 'text-white' : colors.iconColor} />
              <span>{dep.DepName} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Add/Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* max-h + flex column: หัวและปุ่มท้ายอยู่กับที่ ส่วนกลางเลื่อนได้ ปุ่มบันทึกจะไม่หลุดจอ */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCircle />
                {isEditMode ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'เพิ่มข้อมูลเจ้าหน้าที่ใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <User className="w-10 h-10 text-gray-300 mx-auto" />
                        <span className="text-xs text-gray-400 mt-1 block">รูปเจ้าหน้าที่</span>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                    <Camera size={22} />
                    <span className="text-xs font-bold">เปลี่ยนรูป</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-primary" />
                  ข้อมูลส่วนตัว
                </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <IdCard size={15} className="text-gray-400" />
                    รหัสเจ้าหน้าที่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="StID"
                    value={formData.StID}
                    onChange={handleInputChange}
                    disabled={isEditMode}
                    placeholder="เช่น ST001"
                    className={`w-full px-4 py-2 border ${formErrors.StID ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {formErrors.StID && <p className="text-red-500 text-xs mt-1">{formErrors.StID}</p>}
                </div>
                
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <User size={15} className="text-gray-400" />
                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="StName"
                    value={formData.StName}
                    onChange={handleInputChange}
                    placeholder="ไม่ต้องมีคำนำหน้า"
                    className={`w-full px-4 py-2 border ${formErrors.StName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none`}
                  />
                  {formErrors.StName && <p className="text-red-500 text-xs mt-1">{formErrors.StName}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Tag size={15} className="text-gray-400" />
                    คำนำหน้าชื่อ <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="TitleNo"
                    value={formData.TitleNo}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.TitleNo ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none`}
                  >
                    <option value="">เลือกคำนำหน้า</option>
                    {options?.titles.map(t => (
                      <option key={t.TitleNo} value={t.TitleNo}>{t.Title}</option>
                    ))}
                  </select>
                  {formErrors.TitleNo && <p className="text-red-500 text-xs mt-1">{formErrors.TitleNo}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <VenusAndMars size={15} className="text-gray-400" />
                    เพศ <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="SexNo"
                    value={formData.SexNo}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.SexNo ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none`}
                  >
                    <option value="">เลือกเพศ</option>
                    {options?.sex.map(s => (
                      <option key={s.SexNo} value={s.SexNo}>{s.SexName}</option>
                    ))}
                  </select>
                  {formErrors.SexNo && <p className="text-red-500 text-xs mt-1">{formErrors.SexNo}</p>}
                </div>
              </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  ตำแหน่งและสังกัด
                </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Layers size={15} className="text-gray-400" />
                    ประเภทตำแหน่ง
                  </label>
                  <select
                    name="PostType"
                    value={formData.PostType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">ทั้งหมด</option>
                    {options?.post_types?.map(pt => (
                      <option key={pt.PostType} value={pt.PostType}>{pt.PostTypeName}</option>
                    ))}
                    <option value="ADD_NEW" className="text-primary font-bold">+ เพิ่มประเภทใหม่...</option>
                    <option value="MANAGE_MASTER" className="text-red-500 font-bold">⚙️ จัดการรายการประเภท...</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Briefcase size={15} className="text-gray-400" />
                    ตำแหน่ง <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="StPost"
                    value={formData.StPost}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.StPost ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none`}
                  >
                    <option value="">เลือกตำแหน่ง</option>
                    {filteredPositions.map(p => (
                      <option key={p.StPost} value={p.StPost}>{p.StPostName}</option>
                    ))}
                    <option value="ADD_NEW" className="text-primary font-bold">+ เพิ่มตำแหน่งใหม่...</option>
                    <option value="MANAGE_MASTER" className="text-red-500 font-bold">⚙️ จัดการรายการตำแหน่ง...</option>
                  </select>
                  {formErrors.StPost && <p className="text-red-500 text-xs mt-1">{formErrors.StPost}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Building2 size={15} className="text-gray-400" />
                    ฝ่าย/แผนก <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="DepNo"
                    value={formData.DepNo}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.DepNo ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none`}
                  >
                    <option value="">เลือกฝ่าย</option>
                    {options?.departments.map(d => (
                      <option key={d.DepNo} value={d.DepNo}>{d.DepName}</option>
                    ))}
                    <option value="ADD_NEW" className="text-primary font-bold">+ เพิ่มฝ่ายใหม่...</option>
                    <option value="MANAGE_MASTER" className="text-red-500 font-bold">⚙️ จัดการรายการฝ่าย...</option>
                  </select>
                  {formErrors.DepNo && <p className="text-red-500 text-xs mt-1">{formErrors.DepNo}</p>}
                </div>
              </div>
              </div>

              {/* User Account Section */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  จัดการบัญชีผู้ใช้งาน
                </h4>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                      <ShieldCheck size={15} className="text-gray-400" />
                      ประเภทผู้ใช้งาน <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableUserTypes.map(type => {
                        const isSuper = type.code === SUPERUSER_TYPE;
                        const OptIcon = isSuper ? ShieldCheck : Briefcase;
                        const isSelected = formData.user_type === type.code;

                        return (
                          <label
                            key={type.code}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-blue-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="user_type"
                              value={type.code}
                              checked={isSelected}
                              onChange={handleInputChange}
                              className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300"
                            />
                            <div className="min-w-0">
                              <span className={`flex items-center gap-1.5 font-bold text-sm ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                                <OptIcon size={15} />
                                {type.name}
                              </span>
                              <span className="block text-xs text-gray-500 mt-0.5">
                                {isSuper ? 'จัดการข้อมูลและตั้งค่าได้ทั้งหมด' : `เข้าถึงเมนูตามสิทธิ์ของ ${type.code}`}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <AtSign size={15} className="text-gray-400" />
                      ชื่อผู้ใช้งาน (Username) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="เช่น admin_staff"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <KeyRound size={15} className="text-gray-400" />
                      {isEditMode ? 'รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน (Password) *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={isEditMode ? "ระบุเพื่อเปลี่ยนรหัสผ่าน" : "กำหนดรหัสผ่าน"}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {isEditMode && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        className="text-xs bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-200 font-bold hover:bg-blue-50 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw size={14} />
                        รีเซ็ตรหัสผ่านเป็นรหัสเจ้าหน้าที่ ({formData.StID})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              </div>

              <div className="flex gap-3 px-8 py-5 border-t border-gray-100 bg-white flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-grow py-3 px-4 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-grow py-3 px-4 bg-white border border-primary text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p>กำลังโหลดข้อมูลเจ้าหน้าที่...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl flex items-center gap-3 border border-red-100">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={displayedStaffs.map(s => s.StID)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedStaffs.map((staff) => (
                <SortableStaffCard
                  key={staff.StID}
                  staff={staff}
                  getDeptColor={getDeptColor}
                  getImageUrl={getImageUrl}
                  handleViewClick={handleViewClick}
                  handleEditClick={handleEditClick}
                  handleDeleteClick={handleDeleteClick}
                  canEdit={canEditStaff}
                  canDelete={canDeleteStaff}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      
      {!loading && displayedStaffs.length === 0 && !error && (
        <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-gray-200">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">ยังไม่มีข้อมูลเจ้าหน้าที่{activeTab !== 'ALL' ? 'ในฝ่ายนี้' : ''}</h3>
          <p className="text-gray-500 mt-1">
            {canCreateStaff
              ? 'กดปุ่ม "เพิ่มเจ้าหน้าที่ใหม่" เพื่อเริ่มสร้างข้อมูล'
              : 'กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มข้อมูล'}
          </p>
        </div>
      )}

      {/* Quick Add Modal (Nested) */}
      {quickAddModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <h4 className="font-bold flex items-center gap-2">
                <Plus size={18} />
                เพิ่ม{quickAddModal.type === 'position' ? 'ตำแหน่ง' : quickAddModal.type === 'department' ? 'ฝ่าย' : 'ประเภทตำแหน่ง'}ใหม่
              </h4>
              <button onClick={() => setQuickAddModal(prev => ({ ...prev, open: false }))} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                  <IdCard size={15} className="text-gray-400" />
                  รหัส{quickAddModal.type === 'position' ? 'ตำแหน่ง' : quickAddModal.type === 'department' ? 'ฝ่าย' : 'ประเภทตำแหน่ง'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickAddModal.id}
                  onChange={(e) => {
                    setQuickAddModal(prev => ({ ...prev, id: e.target.value }));
                    if (quickAddErrors.id) setQuickAddErrors(prev => ({ ...prev, id: '' }));
                  }}
                  placeholder={quickAddModal.type === 'position' ? 'เช่น P4' : quickAddModal.type === 'department' ? 'เช่น 04' : 'เช่น T1'}
                  className={`w-full px-4 py-2 border ${quickAddErrors.id ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg outline-none focus:ring-2 focus:ring-primary`}
                />
                {quickAddErrors.id && <p className="text-red-500 text-xs mt-1">{quickAddErrors.id}</p>}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                  <Tag size={15} className="text-gray-400" />
                  ชื่อ{quickAddModal.type === 'position' ? 'ตำแหน่ง' : quickAddModal.type === 'department' ? 'ฝ่าย' : 'ประเภทตำแหน่ง'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickAddModal.name}
                  onChange={(e) => {
                    setQuickAddModal(prev => ({ ...prev, name: e.target.value }));
                    if (quickAddErrors.name) setQuickAddErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder={quickAddModal.type === 'position' ? 'เช่น ผู้จัดการ' : quickAddModal.type === 'department' ? 'เช่น ฝ่ายบุคคล' : 'เช่น ข้าราชการ'}
                  className={`w-full px-4 py-2 border ${quickAddErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg outline-none focus:ring-2 focus:ring-primary`}
                />
                {quickAddErrors.name && <p className="text-red-500 text-xs mt-1">{quickAddErrors.name}</p>}
              </div>

              {quickAddModal.type === 'position' && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Layers size={15} className="text-gray-400" />
                    ประเภทตำแหน่ง
                  </label>
                  <select
                    value={quickAddModal.postType}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        const nextId = options?.nextPostType || '';
                        setQuickAddModal(prev => ({ ...prev, open: true, type: 'postType', id: nextId, name: '' }));
                        return;
                      }
                      setQuickAddModal(prev => ({ ...prev, postType: e.target.value }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">(ไม่ระบุประเภท)</option>
                    {options?.post_types?.map(pt => (
                      <option key={pt.PostType} value={pt.PostType}>{pt.PostTypeName}</option>
                    ))}
                    <option value="ADD_NEW" className="text-primary font-bold">+ เพิ่มประเภทใหม่...</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (quickAddModal.type === 'postType') {
                      // Back to Position modal
                      setQuickAddModal(prev => ({ ...prev, open: true, type: 'position' }));
                    } else {
                      setQuickAddModal(prev => ({ ...prev, open: false }));
                    }
                  }}
                  className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-white border border-primary text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage user_type Modal */}
      {userTypeModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-5 text-white flex justify-between items-center flex-shrink-0">
              <h4 className="font-bold flex items-center gap-2">
                <ShieldCheck size={20} />
                จัดการ user_type และสิทธิ์การเข้าถึง
              </h4>
              <button onClick={() => setUserTypeModal({ open: false, tab: 'permissions' })} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-gray-100 flex-shrink-0">
              <button
                onClick={() => setUserTypeModal(prev => ({ ...prev, tab: 'permissions' }))}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  userTypeModal.tab === 'permissions'
                    ? 'text-primary border-b-2 border-primary bg-blue-50/50'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                สิทธิ์การเข้าถึงเมนู
              </button>
              <button
                onClick={() => setUserTypeModal(prev => ({ ...prev, tab: 'users' }))}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  userTypeModal.tab === 'users'
                    ? 'text-primary border-b-2 border-primary bg-blue-50/50'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                ประเภทผู้ใช้งานรายคน ({staffs.length})
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {userTypeModal.tab === 'permissions' ? (
                isLoadingPermissions ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="animate-spin text-primary" size={32} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">
                        ผู้ดูแลระบบเข้าถึงได้ทุกเมนูเสมอ (แก้ไม่ได้) เพื่อกันการตั้งค่าพลาดแล้วล็อกตัวเองออกจากระบบ
                      </p>
                    </div>

                    {/* เพิ่มประเภทผู้ใช้งานใหม่ */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">เพิ่มประเภทผู้ใช้งานใหม่</p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={newTypeForm.code}
                          onChange={(e) => setNewTypeForm(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="รหัส เช่น supervisor"
                          className="flex-1 min-w-[140px] px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                        />
                        <input
                          type="text"
                          value={newTypeForm.name}
                          onChange={(e) => setNewTypeForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="ชื่อที่แสดง เช่น หัวหน้างาน"
                          className="flex-1 min-w-[140px] px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleAddUserType}
                          disabled={isAddingType}
                          className="px-4 py-2 bg-white border border-primary text-primary rounded-lg font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isAddingType ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                          เพิ่ม
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        รหัสใช้ a-z, 0-9, _ ขึ้นต้นด้วยตัวอักษร — ประเภทใหม่จะเริ่มด้วยสิทธิ์เข้าถึงเฉพาะ Dashboard
                      </p>
                    </div>

                    {/* ตารางสิทธิ์: 1 คอลัมน์ต่อ 1 ประเภท */}
                    <div className="overflow-x-auto">
                      <div className="min-w-max">
                        <div className="flex items-end gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                          <span className="w-56 text-xs font-bold text-slate-500 uppercase tracking-wider">เมนู</span>
                          {availableUserTypes.map(type => (
                            <div key={type.code} className="w-28 flex flex-col items-center gap-1">
                              <span className="text-xs font-bold text-slate-700 text-center leading-tight">{type.name}</span>
                              <span className="text-[10px] text-slate-400">{type.code}</span>
                              {!type.is_system && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserType(type)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                  title="ลบประเภทนี้"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5 mt-1.5">
                          {MENU_CATALOG.map(item => (
                            <React.Fragment key={item.key}>
                              <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-gray-100">
                                <span className="w-56 text-sm font-medium text-gray-700">{item.label}</span>
                                {availableUserTypes.map(type => {
                                  const isSuper = type.code === SUPERUSER_TYPE;
                                  return (
                                    <span key={type.code} className="w-28 flex justify-center">
                                      <input
                                        type="checkbox"
                                        checked={isSuper || (permissions[type.code] || []).includes(item.key)}
                                        disabled={isSuper}
                                        onChange={() => toggleTypeMenu(type.code, item.key)}
                                        className={`w-4 h-4 rounded border-gray-300 ${
                                          isSuper ? 'text-gray-400 cursor-not-allowed' : 'text-primary focus:ring-primary cursor-pointer'
                                        }`}
                                      />
                                    </span>
                                  );
                                })}
                              </div>

                              {/* เมนูย่อย เยื้องเข้ามาให้เห็นว่าอยู่ใต้เมนูแม่ */}
                              {(SUBMENU_CATALOG[item.key] || []).map(child => (
                                <div
                                  key={child.key}
                                  className="flex items-center gap-2 px-3 py-2 bg-slate-50/60 rounded-lg border border-gray-100"
                                >
                                  <span className="w-56 text-sm text-gray-600 pl-6 flex items-center gap-1.5">
                                    <span className="text-gray-300">└</span>
                                    {child.label}
                                  </span>
                                  {availableUserTypes.map(type => {
                                    const isSuper = type.code === SUPERUSER_TYPE;
                                    const parentAllowed = (permissions[type.code] || []).includes(item.key);
                                    return (
                                      <span key={type.code} className="w-28 flex justify-center">
                                        <input
                                          type="checkbox"
                                          checked={isSuper || (permissions[type.code] || []).includes(child.key)}
                                          disabled={isSuper || !parentAllowed}
                                          onChange={() => toggleTypeMenu(type.code, child.key)}
                                          title={!isSuper && !parentAllowed ? 'ต้องเปิดสิทธิ์เมนูแม่ก่อน' : undefined}
                                          className={`w-4 h-4 rounded border-gray-300 ${
                                            isSuper || !parentAllowed
                                              ? 'text-gray-400 cursor-not-allowed'
                                              : 'text-primary focus:ring-primary cursor-pointer'
                                          }`}
                                        />
                                      </span>
                                    );
                                  })}
                                </div>
                              ))}
                            </React.Fragment>
                          ))}

                          {/* สิทธิ์ระดับปุ่มในหน้าข้อมูลเจ้าหน้าที่ (ทั้งปุ่มบนการ์ดและปุ่มด้านบนหน้า) */}
                          <div className="flex items-center gap-2 px-3 pt-4 pb-1">
                            <span className="w-56 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              ปุ่มในหน้าข้อมูลเจ้าหน้าที่
                            </span>
                          </div>

                          {ACTION_CATALOG.map(item => {
                            const { Icon, color } = ACTION_ICONS[item.key] ?? { Icon: Settings, color: 'text-gray-400' };

                            return (
                            <div
                              key={item.key}
                              className="flex items-center gap-2 px-3 py-2.5 bg-amber-50/40 rounded-lg border border-amber-100"
                            >
                              <span className="w-56 text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                <Icon size={14} className={color} />
                                {item.label}
                              </span>
                              {availableUserTypes.map(type => {
                                const isSuper = type.code === SUPERUSER_TYPE;
                                return (
                                  <span key={type.code} className="w-28 flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={isSuper || (permissions[type.code] || []).includes(item.key)}
                                      disabled={isSuper}
                                      onChange={() => toggleTypeMenu(type.code, item.key)}
                                      className={`w-4 h-4 rounded border-gray-300 ${
                                        isSuper ? 'text-gray-400 cursor-not-allowed' : 'text-primary focus:ring-primary cursor-pointer'
                                      }`}
                                    />
                                  </span>
                                );
                              })}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPermissions(prev => ({
                        ...prev,
                        staff: DEFAULT_PERMISSIONS.staff,
                        ...Object.fromEntries(
                          availableUserTypes
                            .filter(t => !t.is_system)
                            .map(t => [t.code, DEFAULT_NEW_TYPE_MENU_KEYS])
                        )
                      }))}
                      className="text-xs text-gray-500 hover:text-primary font-medium flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} />
                      คืนค่าเริ่มต้น (เจ้าหน้าที่ = ทุกเมนูยกเว้นข้อมูลเจ้าหน้าที่, ประเภทอื่น = Dashboard)
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      value={userTypeSearch}
                      onChange={(e) => setUserTypeSearch(e.target.value)}
                      placeholder="ค้นหาชื่อหรือรหัสเจ้าหน้าที่..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    {staffs
                      .filter(s =>
                        !userTypeSearch ||
                        s.StName.includes(userTypeSearch) ||
                        s.StID.toLowerCase().includes(userTypeSearch.toLowerCase())
                      )
                      .map(s => {
                        const value = userTypeDraft[s.StID] || s.user_type || 'staff';
                        const isChanged = value !== (s.user_type || 'staff');

                        return (
                          <div
                            key={s.StID}
                            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                              isChanged ? 'border-primary bg-blue-50' : 'border-gray-100 bg-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">
                                {(s.Title || '') + s.StName}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {s.StID}{!s.user_type && ' · ยังไม่มีบัญชีผู้ใช้'}
                              </p>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                              {availableUserTypes.map(type => {
                                const OptIcon = type.code === SUPERUSER_TYPE ? ShieldCheck : Briefcase;
                                const isSelected = value === type.code;

                                return (
                                  <label
                                    key={type.code}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-primary bg-white text-primary shadow-sm'
                                        : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-white'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`user_type_${s.StID}`}
                                      checked={isSelected}
                                      onChange={() => setUserTypeDraft(prev => ({ ...prev, [s.StID]: type.code }))}
                                      className="sr-only"
                                    />
                                    <OptIcon size={13} />
                                    {type.name}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setUserTypeModal({ open: false, tab: 'permissions' })}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                ปิด
              </button>
              <button
                onClick={userTypeModal.tab === 'permissions' ? handleSavePermissions : handleSaveUserTypes}
                disabled={isSavingUserType}
                className="flex-[2] py-2.5 bg-white border border-primary text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingUserType ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {userTypeModal.tab === 'permissions' ? 'บันทึกสิทธิ์การเข้าถึง' : 'บันทึกประเภทผู้ใช้งาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Master Data Modal */}
      {manageModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <h4 className="font-bold flex items-center gap-2">
                <Settings size={18} />
                จัดการข้อมูล{manageModal.type === 'position' ? 'ตำแหน่ง' : manageModal.type === 'department' ? 'ฝ่าย' : 'ประเภทตำแหน่ง'}
              </h4>
              <button onClick={() => setManageModal({ open: false, type: null })} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {manageModal.type === 'position' ? (
                  options?.positions.map(p => (
                    <div key={p.StPost} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Briefcase size={16} className="text-primary flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-400">{p.StPost}</span>
                        <span className="font-medium text-gray-700">{p.StPostName}</span>
                      </div>
                      <button 
                        onClick={() => handleMasterDelete('position', p.StPost)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="ลบตำแหน่ง"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))
                ) : manageModal.type === 'department' ? (
                  options?.departments.map(d => {
                    const depColors = getDeptColor(d.DepNo);
                    const DepIcon = depColors.icon;
                    return (
                    <div key={d.DepNo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        {/* ไอคอน/สีเดียวกับแท็บฝ่าย เพื่อให้จำได้ว่าฝ่ายไหนคือฝ่ายไหน */}
                        <DepIcon size={16} className={`${depColors.iconColor} flex-shrink-0`} />
                        <span className="text-xs font-bold text-gray-400">{d.DepNo}</span>
                        <span className="font-medium text-gray-700">{d.DepName}</span>
                      </div>
                      <button 
                        onClick={() => handleMasterDelete('department', d.DepNo)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="ลบฝ่าย"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    );
                  })
                ) : (
                  options?.post_types?.map(pt => (
                    <div key={pt.PostType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-primary flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-400">{pt.PostType}</span>
                        <span className="font-medium text-gray-700">{pt.PostTypeName}</span>
                      </div>
                      <button 
                        onClick={() => handleMasterDelete('postType', pt.PostType)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="ลบประเภทตำแหน่ง"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  const type = manageModal.type;
                  setManageModal({ open: false, type: null });
                  setQuickAddModal({ open: true, type, id: '', name: '', postType: '' });
                }}
                className="w-full mt-6 py-3 bg-white border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus size={18} />
                เพิ่มข้อมูลใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Modal */}
      {viewModal.open && viewModal.staff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCircle />
                รายละเอียดเจ้าหน้าที่
              </h3>
              <button onClick={() => setViewModal({ open: false, staff: null })} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col items-center mb-6">
                <img 
                  src={getImageUrl(viewModal.staff.image)} 
                  alt={viewModal.staff.StName} 
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-gray-100 mb-4"
                />
                <h3 className="text-2xl font-bold text-gray-800">
                  {viewModal.staff.Title}{viewModal.staff.StName}
                </h3>
                <span className="text-sm font-bold text-primary uppercase tracking-wider mt-1">{viewModal.staff.StID}</span>
              </div>

              <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium flex items-center gap-2">
                    <VenusAndMars size={15} className="text-gray-400" />
                    เพศ
                  </span>
                  <span className="text-gray-800 font-semibold">{viewModal.staff.SexName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium flex items-center gap-2">
                    <Layers size={15} className="text-gray-400" />
                    ประเภทตำแหน่ง
                  </span>
                  <span className="text-gray-800 font-semibold">{viewModal.staff.PostTypeName || 'ไม่ระบุ'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium flex items-center gap-2">
                    <Briefcase size={15} className="text-gray-400" />
                    ตำแหน่ง
                  </span>
                  <span className="text-gray-800 font-semibold">{viewModal.staff.StPostName || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium flex items-center gap-2">
                    <Building2 size={15} className="text-gray-400" />
                    ฝ่าย/แผนก
                  </span>
                  <span className="text-gray-800 font-semibold">{viewModal.staff.DepName || '-'}</span>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                {/* ปุ่มนี้เปิดฟอร์มแก้ไขเหมือนกัน จึงต้องคุมด้วยสิทธิ์เดียวกับปุ่มในการ์ด */}
                {canEditStaff && (
                  <button
                    onClick={() => {
                      const staff = viewModal.staff;
                      setViewModal({ open: false, staff: null });
                      if(staff) handleEditClick(staff);
                    }}
                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings size={18} />
                    แก้ไขข้อมูล
                  </button>
                )}
                <button
                  onClick={() => setViewModal({ open: false, staff: null })}
                  className="flex-1 py-3 bg-white border border-primary text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  ปิด
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

export default StaffManagement;
