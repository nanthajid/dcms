import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Phone, GraduationCap, Briefcase, Award, Star } from 'lucide-react';
import Navbar from '../components/Navbar';

interface Counselor {
  id: number;
  fullname: string;
  specialty: string;
  education_background: string;
  bio: string;
  image_url: string;
  rating: string;
}

const CounselorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);

  // ปรับให้รองรับทั้งตอนรัน dev และตอนขึ้น server จริง
  const API_BASE_URL = import.meta.env.DEV 
    ? 'http://localhost/ar2home/' 
    : '/dcms/';

  useEffect(() => {
    const fetchCounselor = async () => {
      try {
        setLoading(true);
        // เรียก API ไปยังโฟลเดอร์ api โดยตรง
        const response = await axios.get(`${API_BASE_URL}api/get_counselors.php`);
        
        // ตรวจสอบข้อมูลที่ได้จาก API
        if (Array.isArray(response.data)) {
          const found = response.data.find((c: Counselor) => String(c.id) === String(id));
          if (found) {
            setCounselor(found);
          } else {
            console.error('Counselor not found for ID:', id);
          }
        }
      } catch (error) {
        console.error('Error fetching counselor detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounselor();
  }, [id, API_BASE_URL]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-primary font-semibold">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!counselor) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">ไม่พบข้อมูลนักแนะแนว</h2>
        <button 
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-2 rounded-lg"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-0 md:px-4 py-0 md:py-12">
        {/* Mobile Back Button - Floating or fixed at top */}
        <div className="px-4 py-4 md:hidden">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 font-medium"
          >
            <ArrowLeft size={20} />
            <span>กลับ</span>
          </button>
        </div>

        {/* Desktop Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="hidden md:flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>กลับหน้าก่อนหน้า</span>
        </button>

        <div className="bg-white md:rounded-3xl shadow-none md:shadow-xl overflow-hidden border-0 md:border md:border-gray-100">
          {/* Header Section - Mobile Optimized */}
          <div className="bg-primary px-6 py-10 md:p-12 text-white relative">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start relative z-10">
              <div className="w-40 h-40 md:w-64 md:h-64 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl shrink-0">
                <img 
                  src={counselor.image_url ? (counselor.image_url.startsWith('http') ? counselor.image_url : API_BASE_URL + counselor.image_url) : 'https://via.placeholder.com/300'} 
                  alt={counselor.fullname} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center md:text-left pt-2">
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-widest border border-white/10">Expert Counselor</span>
                  <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1">
                    <Star size={10} fill="currentColor" />
                    {counselor.rating || '5.0'} Rating
                  </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight leading-tight">{counselor.fullname}</h1>
                <p className="text-lg md:text-2xl text-blue-100/90 font-medium mb-8 md:mb-10 max-w-xl mx-auto md:mx-0">{counselor.specialty}</p>
                
                <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3 w-full sm:w-auto">
                  <button className="bg-white text-primary px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-lg shadow-black/10 text-base md:text-lg">
                    จองคิวรับคำปรึกษา
                  </button>
                  <button className="bg-white/10 border border-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all text-base">
                    ดาวน์โหลดประวัติ (PDF)
                  </button>
                </div>
              </div>
            </div>
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none"></div>
          </div>

          {/* Content Section - Grid for desktop, stack for mobile */}
          <div className="p-6 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-16">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <section className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-primary">
                    <GraduationCap size={20} />
                    ประวัติการศึกษา
                  </h3>
                  <div className="text-gray-600 text-sm md:text-base whitespace-pre-line">
                    {counselor.education_background || 'ยังไม่มีข้อมูลประวัติการศึกษา'}
                  </div>
                </section>

                <section className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-primary">
                    <Briefcase size={20} />
                    ประสบการณ์
                  </h3>
                  <div className="text-gray-600 text-sm md:text-base whitespace-pre-line">
                    {counselor.bio || 'ยังไม่มีข้อมูลประสบการณ์'}
                  </div>
                </section>
              </div>

              <section>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <span className="w-1.5 h-6 md:h-8 bg-primary rounded-full"></span>
                  ความเชี่ยวชาญพิเศษ
                </h2>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {counselor.specialty.split(',').map((skill, index) => (
                    <span key={index} className="bg-blue-50 text-primary border border-blue-100 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold shadow-sm">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar - Below content on mobile, sticky on desktop */}
            <div className="space-y-6 md:space-y-8">
              <div className="bg-gray-50/80 rounded-3xl p-6 md:p-8 border border-gray-100 md:sticky md:top-8">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-6">ข้อมูลการติดต่อ</h3>
                
                <div className="space-y-5">
                  <a href="mailto:contact@doe-ar2.com" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white transition-colors border border-transparent hover:border-gray-100 group">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-gray-100 group-hover:bg-primary group-hover:text-white transition-all">
                      <Mail size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest">Email</p>
                      <p className="text-gray-800 font-semibold break-all text-sm md:text-base">contact@doe-ar2.com</p>
                    </div>
                  </a>

                  <a href="tel:02-XXX-XXXX" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white transition-colors border border-transparent hover:border-gray-100 group">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-gray-100 group-hover:bg-primary group-hover:text-white transition-all">
                      <Phone size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest">Phone</p>
                      <p className="text-gray-800 font-semibold text-sm md:text-base">02-XXX-XXXX ต่อ XXX</p>
                    </div>
                  </a>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                    <p className="text-xs text-primary/70 font-bold uppercase tracking-widest mb-2 text-center">Achievements</p>
                    <div className="flex items-center gap-3 text-gray-800">
                      <Award className="text-yellow-500 shrink-0" size={24} />
                      <span className="text-sm font-bold leading-snug">นักแนะแนวดีเด่นระดับภาค ประจำปี 2566</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-gray-50 md:bg-white border-t border-gray-100 py-10">
        <div className="container mx-auto px-6 text-center text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-widest">
          &copy; 2024 กองส่งเสริมการมีงานทำ - กรมการจัดหางาน
        </div>
      </footer>
    </div>
  );
};

export default CounselorDetail;
