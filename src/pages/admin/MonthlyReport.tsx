import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar as CalendarIcon,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const MonthlyReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [settings, setSettings] = useState<any>({ agency_name: 'สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒', director_post_id: 'P12' });

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/dcms/api/admin/settings_management.php?action=get');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leaveRes, staffRes] = await Promise.all([
        axios.get('/dcms/api/admin/leave_management.php?action=list'),
        axios.get('/dcms/api/admin/staff_list.php')
      ]);
      setLeaveData(leaveRes.data.data || []);
      setStaffs(staffRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = leaveData.filter(item => {
    const itemDate = new Date(item.start_date);
    return (itemDate.getMonth() + 1) === selectedMonth && itemDate.getFullYear() === selectedYear;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const title = [
      ['รายงานข้อมูลการลาของข้าราชการและเจ้าหน้าที่'],
      [`หน่วยงาน ${settings.agency_name}`],
      [`ประจำเดือน ${thaiMonths[selectedMonth - 1]} พ.ศ. ${selectedYear + 543}`],
      []
    ];

    const headers = [['ลำดับที่', 'ชื่อ-นามสกุล/ตำแหน่ง', 'วันที่ลา', 'ประเภทการลา']];

    const rows = groupedReportData.map((item: any, idx: number) => [
      idx + 1,
      `${item.StName}\n(${item.StPostName || '-'})`,
      item.dates.sort((a: number, b: number) => a - b).join(', '),
      item.leaveTypes.join(', ')
    ]);

    const footer = [
      [],
      [],
      ['', '', '', `ลงชื่อ ............................................................`],
      ['', '', '', `( ${director?.StName || '............................................................'} )`],
      ['', '', '', `ผู้อำนวยการ${settings.agency_name}`]
    ];

    const data = [...title, ...headers, ...rows, ...footer];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Styling: Column widths
    ws['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 40 }, // ชื่อ-ตำแหน่ง
      { wch: 30 }, // วันที่
      { wch: 50 }  // ประเภทการลา
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leave Report");
    XLSX.writeFile(wb, `รายงาน_การลา_${thaiMonths[selectedMonth - 1]}_${selectedYear + 543}.xlsx`);
  };

  const director = staffs.find(s => s.StPost === settings.director_post_id) || staffs[0];

  const groupedReportData = Object.values(filteredData.reduce((acc: any, curr: any) => {
    if (!acc[curr.StID]) {
      acc[curr.StID] = {
        StName: curr.StName,
        StPostName: curr.StPostName,
        dates: [],
        leaveTypes: []
      };
    }
    const d = new Date(curr.start_date).getDate();
    if (!acc[curr.StID].dates.includes(d)) {
      acc[curr.StID].dates.push(d);
    }
    if (curr.leave_name && !acc[curr.StID].leaveTypes.includes(curr.leave_name)) {
      acc[curr.StID].leaveTypes.push(curr.leave_name);
    }
    return acc;
  }, {}));


  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: black;
            background: white;
            font-family: "TH Sarabun New", "Sarabun", sans-serif;
          }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">รายงานประจำเดือน</h2>
          <p className="text-gray-500">สรุปข้อมูลการปฏิบัติงานและรายงานต่างๆ ประจำเดือน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Filter Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Filter size={18} className="text-primary" />
              ตัวเลือกรายงาน
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลือกเดือน</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                >
                  {thaiMonths.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลือกปี</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                >
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return <option key={y} value={y}>{y + 543}</option>
                  })}
                </select>
              </div>

              <div className="pt-2">
                <button 
                  onClick={fetchData}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Search size={18} />
                  รีเฟรชข้อมูล
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              ข้อมูลเพิ่มเติม
            </h4>
            <p className="text-sm text-blue-600 leading-relaxed">
              รายงานนี้จะรวบรวมข้อมูลการลาของเจ้าหน้าที่ทุกคนในหน่วยงาน 
              โดยสรุปเป็นรายเดือนเพื่อนำส่งผู้บริหาร
            </p>
          </div>
        </div>

        {/* Report Preview/Action Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 uppercase tracking-tight">รายงานวันลาของเจ้าหน้าที่</h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full mr-2">
                  {thaiMonths[selectedMonth - 1]} {selectedYear + 543}
                </span>
                {filteredData.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold text-sm"
                    >
                      <FileSpreadsheet size={16} />
                      Export Excel
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold text-sm"
                    >
                      <Printer size={16} />
                      พิมพ์รายงาน
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="animate-spin text-primary" size={40} />
                  <p className="text-gray-500">กำลังประมวลผลข้อมูล...</p>
                </div>
              ) : filteredData.length > 0 ? (
                <div className="space-y-6">
                  {/* Summary Table Preview */}
                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-sm">
                          <th className="px-4 py-3 font-bold border-b border-gray-100 w-16 text-center">ลำดับ</th>
                          <th className="px-4 py-3 font-bold border-b border-gray-100 w-1/4">ชื่อ-นามสกุล / ตำแหน่ง</th>
                          <th className="px-4 py-3 font-bold border-b border-gray-100">วันที่ลา</th>
                          <th className="px-4 py-3 font-bold border-b border-gray-100 w-1/4">ประเภทการลา</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {groupedReportData.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors text-sm">
                            <td className="px-4 py-4 text-center text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-4">
                              <div className="font-bold text-gray-800">{item.StName}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{item.StPostName || '-'}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1">
                                {item.dates.sort((a: number, b: number) => a - b).map((d: number) => (
                                  <span key={d} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-gray-600 leading-relaxed">
                              {item.leaveTypes.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1">
                                  {item.leaveTypes.map((lt: string, i: number) => (
                                    <li key={i} className="text-xs">{lt}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-gray-400 text-xs italic">ไม่ระบุ</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="bg-gray-50 p-8 rounded-full">
                    <CalendarIcon size={64} className="text-gray-300" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-400">ไม่พบข้อมูลการลาในเดือนนี้</h4>
                    <p className="text-gray-400 mt-1">กรุณาเลือกเดือนอื่นหรือเพิ่มข้อมูลการลาในระบบ</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formal Printable Report - Hidden on screen, visible only on print */}
      <div id="printable-report" className="hidden print:block p-10 bg-white">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold mb-1">รายงานข้อมูลการลาของข้าราชการและเจ้าหน้าที่</h1>
          <h2 className="text-lg font-bold mb-1">หน่วยงาน {settings.agency_name}</h2>
          <h2 className="text-lg font-bold">ประจำเดือน {thaiMonths[selectedMonth - 1]} พ.ศ. {selectedYear + 543}</h2>
        </div>

        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 w-[10%] text-center">ลำดับที่</th>
              <th className="border border-black p-2 w-[40%] text-center">ชื่อ-นามสกุล/ตำแหน่ง</th>
              <th className="border border-black p-2 w-[25%] text-center">วันที่ลา</th>
              <th className="border border-black p-2 w-[25%] text-center">ประเภทการลา</th>
            </tr>
          </thead>
          <tbody>
            {groupedReportData.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="border border-black p-2 text-center align-top">{idx + 1}</td>
                <td className="border border-black p-2 align-top">
                  <div className="font-bold">{item.StName}</div>
                  <div className="text-xs">{item.StPostName || '-'}</div>
                </td>
                <td className="border border-black p-2 text-center align-top">
                  {item.dates.sort((a: number, b: number) => a - b).join(', ')}
                </td>
                <td className="border border-black p-2 align-top">
                  <div className="space-y-1">
                    {item.leaveTypes.map((lt: string, i: number) => (
                      <div key={i}>- {lt}</div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20 flex justify-end pr-20">
          <div className="text-center w-80">
            <div className="mb-4">ลงชื่อ ............................................................</div>
            <div className="font-bold">( {director?.StName || '............................................................'} )</div>
            <div className="text-sm mt-1">ผู้อำนวยการ{settings.agency_name}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
