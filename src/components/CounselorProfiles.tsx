import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Star, ExternalLink, GraduationCap, Briefcase, Mail, Phone, Calendar } from 'lucide-react';

interface Counselor {
  id: number;
  fullname: string;
  specialty: string;
  education_background: string;
  bio: string;
  image_url: string;
  rating: string;
}

const CounselorProfiles: React.FC = () => {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.DEV 
    ? 'http://localhost/ar2home/' 
    : '/dcms/';

  useEffect(() => {
    const fetchCounselors = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}api/get_counselors.php`);
        setCounselors(response.data);
      } catch (error) {
        console.error('Error fetching counselors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounselors();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center space-x-2 animate-pulse">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <div className="w-3 h-3 bg-primary rounded-full"></div>
          </div>
          <p className="mt-4 text-gray-500 font-medium">กำลังโหลดข้อมูลนักแนะแนว...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="space-y-20 max-w-6xl mx-auto">
          {counselors.map((counselor) => (
            <div 
              key={counselor.id} 
              className="bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 overflow-hidden border border-gray-100 flex flex-col transition-all duration-500 hover:border-primary/20"
            >
              {/* Top Section: Photo & Core Info */}
              <div className="bg-primary p-8 md:p-12 text-white flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl shrink-0 relative z-10">
                  <img 
                    src={counselor.image_url ? (counselor.image_url.startsWith('http') ? counselor.image_url : API_BASE_URL + counselor.image_url) : 'https://via.placeholder.com/400'} 
                    alt={counselor.fullname} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="text-center md:text-left relative z-10 flex-grow">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">Expert Counselor</span>
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Star size={10} fill="currentColor" />
                      {counselor.rating || '5.0'} Rating
                    </div>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">{counselor.fullname}</h3>
                  <p className="text-lg md:text-2xl text-blue-100/90 font-medium mb-8">{counselor.specialty}</p>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <button className="bg-white text-primary px-8 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-lg text-base flex items-center gap-2">
                      <Calendar size={18} />
                      จองคิวรับคำปรึกษา
                    </button>
                    <Link 
                      to={`/counselor/${counselor.id}`}
                      className="bg-white/10 border border-white/20 backdrop-blur-sm text-white px-8 py-3 rounded-2xl font-bold hover:bg-white/20 transition-all text-base flex items-center gap-2"
                    >
                      <ExternalLink size={18} />
                      ดูรายละเอียดเพิ่มเติม
                    </Link>
                  </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none"></div>
              </div>

              {/* Bottom Section: Full Details Content */}
              <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content (2/3) */}
                <div className="lg:col-span-2 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-primary">
                        <GraduationCap size={20} />
                        ประวัติการศึกษา
                      </h5>
                      <div className="text-gray-600 text-sm font-medium whitespace-pre-line">
                        {counselor.education_background || 'ยังไม่มีข้อมูลประวัติการศึกษา'}
                      </div>
                    </section>

                    <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-primary">
                        <Briefcase size={20} />
                        ประสบการณ์
                      </h5>
                      <div className="text-gray-600 text-sm font-medium whitespace-pre-line">
                        {counselor.bio || 'ยังไม่มีข้อมูลประสบการณ์'}
                      </div>
                    </section>
                  </div>

                  <section>
                    <h4 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-3">
                      <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                      ความเชี่ยวชาญพิเศษ
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {counselor.specialty.split(',').map((skill, index) => (
                        <span key={index} className="bg-blue-50 text-primary border border-blue-100 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Sidebar Info (1/3) */}
                <div className="space-y-6">
                  <div className="bg-gray-50/80 rounded-3xl p-8 border border-gray-100 h-full">
                    <h4 className="text-lg font-bold text-gray-800 mb-6">ข้อมูลการติดต่อ</h4>
                    
                    <div className="space-y-5">
                      <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-gray-100">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                          <Mail size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest">Email</p>
                          <p className="text-gray-800 font-semibold text-sm break-all">contact@doe-ar2.com</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-gray-100">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                          <Phone size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest">Phone</p>
                          <p className="text-gray-800 font-semibold text-sm">02-XXX-XXXX</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CounselorProfiles;
