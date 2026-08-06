import React from 'react';
import { UserPlus, Search, CalendarCheck, FileText } from 'lucide-react';

const steps = [
  {
    icon: <UserPlus className="w-12 h-12 text-primary" />,
    title: "1. ลงทะเบียนเข้าใช้งาน",
    description: "สมัครสมาชิกและกรอกข้อมูลเบื้องต้นเพื่อเข้าถึงบริการ"
  },
  {
    icon: <Search className="w-12 h-12 text-primary" />,
    title: "2. ค้นหานักแนะแนว",
    description: "เลือกนักแนะแนวที่เหมาะสมกับความต้องการของคุณ"
  },
  {
    icon: <CalendarCheck className="w-12 h-12 text-primary" />,
    title: "3. นัดหมายเวลา",
    description: "เลือกวันและเวลาที่สะดวกเพื่อรับคำปรึกษาออนไลน์"
  },
  {
    icon: <FileText className="w-12 h-12 text-primary" />,
    title: "4. รับสรุปผล",
    description: "รับเอกสารสรุปผลการแนะแนวเพื่อนำไปวางแผนอนาคต"
  }
];

const SystemUsage: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          วิธีการใช้งานระบบ
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="flex justify-center mb-6">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SystemUsage;
