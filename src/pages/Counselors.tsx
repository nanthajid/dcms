import React from 'react';
import Navbar from '../components/Navbar';
import CounselorProfiles from '../components/CounselorProfiles';

import Footer from '../components/Footer';

const Counselors: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow pt-8 md:pt-12">
        <div className="container mx-auto px-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">ทำความรู้จักนักแนะแนวของเรา</h1>
          <p className="text-gray-600 mt-2">ปรึกษาผู้เชี่ยวชาญเพื่ออนาคตที่มั่นคงและอาชีพที่ใช่สำหรับคุณ</p>
        </div>
        <CounselorProfiles />
      </main>
      <Footer />
    </div>
  );
};

export default Counselors;
