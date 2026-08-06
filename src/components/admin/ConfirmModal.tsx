import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'danger',
  size = 'sm'
}) => {
  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
  };

  const colors = {
    danger: {
      icon: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-100',
      button: 'border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500'
    },
    warning: {
      icon: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      button: 'border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500'
    },
    info: {
      icon: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      button: 'border-blue-200 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500'
    }
  };

  const activeColor = colors[type];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* max-h + flex column: message ยาวแค่ไหนก็เลื่อนดูได้ และปุ่มยืนยันไม่หลุดจอ */}
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidths[size]} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${activeColor.bg} ${activeColor.icon}`}>
              <AlertCircle size={40} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            {/* div ไม่ใช่ p เพราะ message เป็น ReactNode ที่อาจมี p/div ซ้อนอยู่ */}
            <div className="text-gray-500 text-sm leading-relaxed">{message}</div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-5 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 bg-white border ${activeColor.button} rounded-xl font-bold transition-all shadow-sm`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
