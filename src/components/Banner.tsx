import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Banner: React.FC = () => {
  const [agencyName, setAgencyName] = useState('สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/dcms/api/get_settings.php');
        if (response.data.success && response.data.data.agency_name) {
          setAgencyName(response.data.data.agency_name);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="relative bg-primary overflow-hidden h-[400px] md:h-[500px] flex items-center">
      <div className="absolute inset-0 z-0">
        {/* ใช้ path ที่ถูกต้องสำหรับ production / development */}
        <img 
          src="/dcms/src/assets/hero.png" 
          alt="Government Banner" 
          className="w-full h-full object-cover opacity-30"
          onError={(e) => {
            // Fallback if image not found
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2070';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10 text-white">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-in slide-in-from-left duration-700">
          ระบบแนะแนวการศึกษาและการทำงาน
        </h1>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg inline-block mb-6 border border-white/20">
          <p className="text-lg md:text-xl font-medium">
            {agencyName}
          </p>
        </div>
        <p className="text-xl md:text-2xl max-w-2xl text-blue-100/90 leading-relaxed mb-8">
          AR2Home: ศูนย์รวมข้อมูลและบริการด้านการแนะแนวเพื่ออนาคตของเยาวชนไทย 
          เข้าถึงแหล่งข้อมูลตลาดแรงงานและประวัตินักแนะแนวผู้เชี่ยวชาญ
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-white text-primary px-8 py-4 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-xl shadow-black/20 hover:scale-105 active:scale-95">
            เริ่มต้นใช้งานระบบ
          </button>
          <button className="bg-primary/20 border border-white/30 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-black hover:bg-white/10 transition-all">
            ตรวจสอบตารางนัดหมาย
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banner;
