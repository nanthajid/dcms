import React, { useState } from 'react';
import EditableReportTable from '../../components/admin/EditableReportTable';
import { Filter } from 'lucide-react';

interface ReportData {
  id: string;
  staffName: string;
  position: string;
  department: string;
  days: string;
}

const EditableReport: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData[]>([
    {
      id: '1',
      staffName: 'สมชาย ใจดี',
      position: 'นักวิเคราะห์นโยบายและแผน',
      department: 'ฝ่ายแผนและงบประมาณ',
      days: '1, 2, 5, 8'
    },
    {
      id: '2',
      staffName: 'สมหญิง ใจสวย',
      position: 'นักจัดการทั่วไป',
      department: 'ฝ่ายบริหารทั่วไป',
      days: '2, 3, 4'
    },
    {
      id: '3',
      staffName: 'อนุชา มีสติ',
      position: 'นักวิทยาศาสตร์เชี่ยวชาญ',
      department: 'ฝ่ายพัฒนาระบบ',
      days: '1, 6, 7, 8'
    }
  ]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const tableHeaders = ['staffName', 'position', 'department', 'days'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">รายงานแบบแก้ไขได้</h2>
          <p className="text-slate-500">สร้างและแก้ไขรายงานด้วย CRUD Operations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Filter size={18} className="text-primary" />
              เงื่อนไขรายงาน
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  เดือน
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-slate-50"
                >
                  {thaiMonths.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ปี
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-slate-50"
                >
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={y} value={y}>
                        {y + 543}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700">
                  <strong>เดือน:</strong> {thaiMonths[selectedMonth - 1]}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>ปี:</strong> {selectedYear + 543}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Report Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <EditableReportTable
              title={`รายงาน ${thaiMonths[selectedMonth - 1]} ${selectedYear + 543}`}
              headers={tableHeaders}
              data={reportData as any}
              onDataChange={(data) => setReportData(data as ReportData[])}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-2xl border border-blue-100">
        <h3 className="font-bold text-slate-800 mb-3">วิธีการใช้งาน</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>✅ <strong>เพิ่มแถว:</strong> คลิกปุ่ม "เพิ่มแถว" และกรอกข้อมูล</li>
          <li>✏️ <strong>แก้ไข:</strong> คลิกไอคอน "ดินสอ" เพื่อแก้ไขข้อมูลในแถว</li>
          <li>🗑️ <strong>ลบ:</strong> คลิกไอคอน "ถัง" เพื่อลบข้อมูลในแถว</li>
          <li>📥 <strong>นำเข้า:</strong> อัปโหลดไฟล์ JSON เพื่อนำเข้าข้อมูล</li>
          <li>📤 <strong>ส่งออก:</strong> ดาวน์โหลดข้อมูลในรูปแบบ JSON</li>
        </ul>
      </div>

      {/* JSON Format Guide */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3">รูปแบบ JSON</h3>
        <p className="text-sm text-slate-600 mb-3">
          ไฟล์ JSON ควรมีโครงสร้างดังนี้:
        </p>
        <pre className="bg-white p-4 rounded border border-slate-300 overflow-x-auto text-xs">
          {`{
  "title": "รายงาน มกราคม 2567",
  "headers": ["staffName", "position", "department", "days"],
  "data": [
    {
      "id": "1",
      "staffName": "สมชาย ใจดี",
      "position": "นักวิเคราะห์นโยบายและแผน",
      "department": "ฝ่ายแผนและงบประมาณ",
      "days": "1, 2, 5, 8"
    },
    {
      "id": "2",
      "staffName": "สมหญิง ใจสวย",
      "position": "นักจัดการทั่วไป",
      "department": "ฝ่ายบริหารทั่วไป",
      "days": "2, 3, 4"
    }
  ]
}`}
        </pre>
      </div>
    </div>
  );
};

export default EditableReport;
