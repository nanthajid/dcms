import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Footer: React.FC = () => {
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
    <footer className="bg-slate-900 text-white py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-black flex items-center gap-2 justify-center md:justify-start">
              <div className="bg-primary text-white p-1 rounded-lg">AR</div>
              <span>AR2Home</span>
            </h3>
            <p className="text-slate-400 mt-2 text-sm">
              ระบบแนะแนวการศึกษาและการทำงานสมัยใหม่
            </p>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-sm font-bold text-slate-300">
              {agencyName}
            </p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
              &copy; {new Date().getFullYear() + 543} กองส่งเสริมการมีงานทำ - กรมการจัดหางาน
            </p>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-[10px] text-slate-600 uppercase tracking-[0.2em]">
          พัฒนาโดยทีมงานเทคโนโลยีสารสนเทศ | MODERN GOVERNMENT SOLUTION
        </div>
      </div>
    </footer>
  );
};

export default Footer;
