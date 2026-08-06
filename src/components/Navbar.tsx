import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Users, HelpCircle, LogIn, LayoutDashboard } from 'lucide-react';
import axios from 'axios';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [agencyName, setAgencyName] = useState('AR2Home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsLoggedIn(!!token);

    const fetchSettings = async () => {
      try {
        const response = await axios.get('/dcms/api/get_settings.php');
        if (response.data.success && response.data.data.agency_name) {
          // Use a shortened name for navbar if it's too long
          const name = response.data.data.agency_name;
          setAgencyName(name.length > 20 ? 'AR2Home' : name);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-black text-primary flex items-center gap-2 group">
          <div className="bg-primary text-white p-1.5 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">AR</div>
          <span className="tracking-tighter">{agencyName}</span>
        </Link>
        
        <div className="hidden md:flex space-x-1 items-center">
          <Link to="/" className="text-gray-600 hover:text-primary hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all text-sm">
            <Home className="w-4 h-4" /> หน้าแรก
          </Link>
          <Link to="/how-to-use" className="text-gray-600 hover:text-primary hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all text-sm">
            <HelpCircle className="w-4 h-4" /> วิธีการใช้งาน
          </Link>
          <Link to="/counselors" className="text-gray-600 hover:text-primary hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all text-sm">
            <Users className="w-4 h-4" /> นักแนะแนว
          </Link>
          
          <div className="h-6 w-px bg-gray-200 mx-2"></div>

          {isLoggedIn ? (
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-black hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 ml-2"
            >
              <LayoutDashboard className="w-4 h-4" /> ระบบจัดการ
            </button>
          ) : (
            <button 
              onClick={() => navigate('/admin/login')}
              className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-black hover:bg-slate-200 transition-all flex items-center gap-2 ml-2"
            >
              <LogIn className="w-4 h-4" /> เข้าสู่ระบบ
            </button>
          )}
        </div>

        {/* Mobile menu button could be added here */}
      </div>
    </nav>
  );
};

export default Navbar;
