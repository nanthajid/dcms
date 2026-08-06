import React from 'react';
import Navbar from '../components/Navbar';
import SystemUsage from '../components/SystemUsage';

import Footer from '../components/Footer';

const HowToUse: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="py-12 bg-primary text-white text-center">
          <h1 className="text-4xl font-bold mb-2 animate-in fade-in slide-in-from-top duration-500">วิธีการใช้งานระบบ</h1>
          <p className="text-xl text-blue-100">ขั้นตอนง่ายๆ ในการรับบริการแนะแนวออนไลน์</p>
        </div>
        <SystemUsage />
        
        {/* Additional information can be added here */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 border-b pb-4">คำถามที่พบบ่อย</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">ต้องเตรียมตัวอย่างไรก่อนรับคำปรึกษา?</h3>
                <p className="text-gray-600">ควรเตรียมข้อมูลเกี่ยวกับการเรียน ผลการเรียน หรือความสนใจในอาชีพเบื้องต้น เพื่อให้การสนทนาเป็นไปอย่างมีประสิทธิภาพ</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">ใช้เวลาในการปรึกษานานเท่าไหร่?</h3>
                <p className="text-gray-600">โดยปกติจะใช้เวลาประมาณ 30-45 นาทีต่อครั้ง ขึ้นอยู่กับความซับซ้อนของประเด็นที่ต้องการปรึกษา</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowToUse;
