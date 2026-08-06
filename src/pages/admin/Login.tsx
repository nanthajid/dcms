import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<{username?: string, password?: string}>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const errors: {username?: string, password?: string} = {};
    if (!username.trim()) errors.username = 'กรุณากรอกชื่อผู้ใช้งาน';
    if (!password.trim()) errors.password = 'กรุณากรอกรหัสผ่าน';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/dcms/api/login.php', {
        username,
        password
      });

      if (response.data.success) {
        localStorage.setItem('admin_token', response.data.token);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        navigate('/admin/dashboard');
      } else {
        setError(response.data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-primary p-8 text-white text-center">
          <h2 className="text-3xl font-bold">Admin Login</h2>
          <p className="mt-2 text-blue-100 font-light">ระบบจัดการเนื้อหา AR2Home</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ใช้งาน</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (formErrors.username) setFormErrors({...formErrors, username: ''});
                }}
                className={`block w-full pl-10 pr-3 py-3 border ${formErrors.username ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-primary focus:border-primary outline-none transition-all`}
                placeholder="Username"
              />
            </div>
            {formErrors.username && <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formErrors.password) setFormErrors({...formErrors, password: ''});
                }}
                className={`block w-full pl-10 pr-10 py-3 border ${formErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-primary focus:border-primary outline-none transition-all`}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white border border-primary text-primary py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-all disabled:opacity-50 flex justify-center items-center shadow-sm"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
