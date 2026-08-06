import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar as CalendarIcon,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Printer,
  FileSpreadsheet,
  Users,
  Briefcase,
  FileText,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const toThaiNumerals = (num: number | string): string => {
  const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().replace(/\d/g, (d) => thaiNumerals[parseInt(d)]);
};

const ExecutiveReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [wfhData, setWfhData] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [printMode, setPrintMode] = useState<'standard' | 'condensed'>('standard');
  const [showCondensedModal, setShowCondensedModal] = useState(false);
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
      const [wfhRes, staffRes] = await Promise.all([
        axios.get('/dcms/api/admin/wfh_management.php?action=list'),
        axios.get('/dcms/api/admin/staff_list.php')
      ]);
      setWfhData(wfhRes.data.data || []);
      setStaffs(staffRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = wfhData.filter(item => {
    const itemDate = new Date(item.start_date);
    return (itemDate.getMonth() + 1) === selectedMonth && itemDate.getFullYear() === selectedYear;
  });

  const handlePrint = () => {
    setPrintMode('standard');
    setTimeout(() => window.print(), 100);
  };

  const handlePrintCondensed = () => {
    setShowCondensedModal(true);
  };

  const handleExportExcel = () => {
    const title = [
      ['รายงานสรุปการปฏิบัติงานนอกสถานที่ (สำหรับผู้บริหาร)'],
      [`หน่วยงาน ${settings.agency_name}`],
      [`ประจำเดือน ${thaiMonths[selectedMonth - 1]} พ.ศ. ${selectedYear + 543}`],
      []
    ];

    const headers = [['ลำดับ', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'ฝ่าย/แผนก', 'จำนวนวัน', 'วันที่ปฏิบัติงาน']];

    const rows = groupedData.map((item: any, idx: number) => [
      idx + 1,
      item.StName,
      item.StPostName || '-',
      item.DepName || '-',
      item.dates.length,
      item.dates.sort((a: number, b: number) => a - b).join(', ')
    ]);

    const data = [...title, ...headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 30 }, // ชื่อ
      { wch: 30 }, // ตำแหน่ง
      { wch: 30 }, // ฝ่าย
      { wch: 10 }, // จำนวนวัน
      { wch: 40 }  // วันที่
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Executive Report");
    XLSX.writeFile(wb, `รายงานผู้บริหาร_WFH_${thaiMonths[selectedMonth - 1]}_${selectedYear + 543}.xlsx`);
  };

  const director = staffs.find(s => s.StPost === settings.director_post_id) || staffs[0];
  const agencyName = settings.agency_name;

  const groupedData = Object.values(filteredData.reduce((acc: any, curr: any) => {
    if (!acc[curr.StID]) {
      // Find staff info to get sort_order
      const staffInfo = staffs.find(s => s.StID === curr.StID);
      acc[curr.StID] = {
        StID: curr.StID,
        StName: curr.StName,
        StPostName: curr.StPostName,
        DepName: curr.DepName,
        sort_order: staffInfo?.sort_order || 999,
        dates: []
      };
    }
    // Safely extract day from YYYY-MM-DD string
    const dateParts = curr.start_date.split('-');
    if (dateParts.length === 3) {
      const d = parseInt(dateParts[2]);
      if (!acc[curr.StID].dates.includes(d)) {
        acc[curr.StID].dates.push(d);
      }
    }
    return acc;
  }, {})).sort((a: any, b: any) => {
    // Sort by sort_order first, then by StID
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return a.StID.localeCompare(b.StID);
  });

  // Stats for Executive view
  const totalStaffWFH = groupedData.length;
  const totalDaysWFH = filteredData.length;

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 1.5cm; }
          body * { visibility: hidden; }
          #printable-executive-report, #printable-executive-report *,
          #printable-condensed-report, #printable-condensed-report * { visibility: visible; }
          
          #printable-executive-report, #printable-condensed-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: black;
            background: white;
            font-family: "TH Sarabun New", "Sarabun", sans-serif;
            font-size: 16px;
          }

          table { font-size: 16px !important; }
          th, td { padding: 4px !important; }

          /* Hide based on mode */
          .mode-standard { display: ${printMode === 'standard' ? 'block' : 'none'} !important; }
          .mode-condensed { display: ${printMode === 'condensed' ? 'block' : 'none'} !important; }

          .no-print { display: none !important; }
        }
      `}} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">สำหรับผู้บริหาร</h2>
          <p className="text-slate-500">รายงานสรุปผลภาพรวมและสถิติการปฏิบัติงานนอกสถานที่</p>
        </div>
      </div>

      {/* Stats Overview - Executive Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-blue-500 p-4 rounded-xl text-white">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">เจ้าหน้าที่ปฏิบัติงาน</p>
            <p className="text-2xl font-bold text-slate-800">{toThaiNumerals(totalStaffWFH)} ราย</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-emerald-500 p-4 rounded-xl text-white">
            <CalendarIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">จำนวนวันปฏิบัติงานรวม</p>
            <p className="text-2xl font-bold text-slate-800">{toThaiNumerals(totalDaysWFH)} วัน</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-amber-500 p-4 rounded-xl text-white">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">เฉลี่ยต่อคน</p>
            <p className="text-2xl font-bold text-slate-800">{toThaiNumerals(totalStaffWFH > 0 ? (totalDaysWFH / totalStaffWFH).toFixed(1) : 0)} วัน</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
        {/* Filter Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 underline underline-offset-8 decoration-primary/30">
              <Filter size={18} className="text-primary" />
              เงื่อนไขรายงาน
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ประจำเดือน</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-slate-50"
                >
                  {thaiMonths.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">พุทธศักราช</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-slate-50"
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
                  className="w-full py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Search size={18} />
                  สรุปผลรายงาน
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">ตารางสรุปข้อมูลสำหรับผู้บริหาร</h3>
              <div className="flex gap-2">
                {filteredData.length > 0 && (
                  <>
                    <button 
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold text-xs"
                    >
                      <FileSpreadsheet size={16} />
                      Export Excel
                    </button>
                    <button 
                      onClick={handlePrintCondensed}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-xs"
                    >
                      <FileText size={16} />
                      รายงาน (รูปแบบย่อ)
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold text-xs"
                    >
                      <Printer size={16} />
                      พิมพ์รายงาน
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="p-0">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="animate-spin text-primary" size={40} />
                  <p className="text-slate-500">กำลังรวบรวมข้อมูลสถิติ...</p>
                </div>
              ) : filteredData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-bold border-b border-slate-100 text-center w-16">#</th>
                        <th className="px-6 py-4 font-bold border-b border-slate-100">ชื่อ-นามสกุล / ตำแหน่ง</th>
                        <th className="px-6 py-4 font-bold border-b border-slate-100">ฝ่าย/แผนก</th>
                        <th className="px-6 py-4 font-bold border-b border-slate-100 text-center">จำนวนวัน</th>
                        <th className="px-6 py-4 font-bold border-b border-slate-100">วันที่ปฏิบัติงาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {groupedData.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{item.StName}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{item.StPostName || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                            <span className="px-2 py-1 bg-slate-100 rounded text-[11px] border border-slate-200 uppercase">
                              {item.DepName || 'ไม่ระบุ'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              item.dates.length >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.dates.length}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {item.dates.sort((a: number, b: number) => a - b).map((d: number) => (
                                <span key={d} className="w-7 h-7 flex items-center justify-center bg-white text-slate-600 rounded-md text-[11px] font-bold border border-slate-200">
                                  {d}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center space-y-4">
                  <div className="bg-slate-50 p-8 rounded-full">
                    <AlertCircle size={64} className="text-slate-300" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-slate-400">ยังไม่มีข้อมูลในเดือนที่เลือก</h4>
                    <p className="text-slate-400 mt-1">กรุณาตรวจสอบข้อมูลในระบบจัดการ WFH</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Condensed Report Preview Modal */}
      {showCondensedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">ตัวอย่างรายงาน (รูปแบบย่อ)</h3>
                  <p className="text-xs text-slate-500">ตรวจสอบข้อมูลก่อนทำการพิมพ์หรือส่งออก</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCondensedModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-grow overflow-y-auto p-4 bg-slate-50/30">
              <div className="bg-white p-8 shadow-sm border border-slate-200 rounded-xl mx-auto w-full min-h-[600px]">
                <div className="text-center mb-8">
                  <h1 className="text-lg font-bold text-slate-900">รายชื่อข้าราชการและเจ้าหน้าที่ปฏิบัติงาน ณ ที่พักอาศัย (Work From Home)</h1>
                  <h2 className="text-md font-bold text-slate-700">หน่วยงาน {agencyName}</h2>
                  <h2 className="text-sm font-bold text-slate-600 uppercase">ประจำเดือน {thaiMonths[selectedMonth - 1]} พ.ศ. {toThaiNumerals(selectedYear + 543)}</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-[10px] mb-8">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-300 p-2 w-8 text-center text-[16px]" rowSpan={2}>ลำดับ</th>
                        <th className="border border-slate-300 p-2 text-left w-48 text-[16px]" rowSpan={2}>ชื่อ-สกุล</th>
                        <th className="border border-slate-300 p-2 text-center w-40 text-[16px]" rowSpan={2}>ตำแหน่ง</th>
                        <th className="border border-slate-300 p-2 text-center text-[16px]" colSpan={daysArray.length}>วันที่ปฏิบัติงาน</th>
                      </tr>
                      <tr className="bg-slate-50">
                        {daysArray.map(d => (
                          <th key={d} className="border border-slate-300 p-1 w-6 text-center font-bold text-[16px]">{toThaiNumerals(d)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedData.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="border border-slate-300 p-2 text-center text-[16px]">{toThaiNumerals(idx + 1)}</td>
                          <td className="border border-slate-300 p-2 font-bold text-[16px]">{item.StName}</td>
                          <td className="border border-slate-300 p-2 text-center leading-tight text-[16px]">{item.StPostName || '-'}</td>
                          {daysArray.map(d => (
                            <td key={d} className="border border-slate-300 p-1 text-center text-[16px]">
                              {item.dates.includes(d) ? (
                                <span className="font-bold text-blue-600 text-[18px]">/</span>
                              ) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-12 pr-10">
                  <div className="text-center w-64 space-y-1">
                    <div className="text-slate-400 italic mb-8 text-[10px]">ลงชื่อ ............................................................</div>
                    <div className="font-bold text-slate-800 text-xs">( {director?.StName || '............................................................'} )</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-tight">ผู้อำนวยการสำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setShowCondensedModal(false)}
                className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition-all"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  setPrintMode('condensed');
                  setTimeout(() => {
                    window.print();
                    setShowCondensedModal(false);
                  }, 150);
                }}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold flex items-center gap-2 transition-all transform active:scale-95"
              >
                <Printer size={18} />
                สั่งพิมพ์รายงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formal Executive Printable Report */}
      <div id="printable-executive-report" className="hidden print:block p-10 bg-white mode-standard">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">รายงานสรุปการปฏิบัติงานนอกสถานที่ (Work From Home)</h1>
          <h2 className="text-xl font-bold mb-2">{agencyName}</h2>
          <h2 className="text-lg font-bold">ประจำเดือน {thaiMonths[selectedMonth - 1]} พุทธศักราช {toThaiNumerals(selectedYear + 543)}</h2>
        </div>

        <div className="mb-6 flex justify-between items-end border-b-2 border-black pb-4 font-bold">
          <div>สรุปภาพรวม: เจ้าหน้าที่ปฏิบัติงานจำนวน {toThaiNumerals(totalStaffWFH)} ราย รวมทั้งสิ้น {toThaiNumerals(totalDaysWFH)} วันทำการ</div>
          <div>ข้อมูล ณ วันที่ {toThaiNumerals(new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }))}</div>
        </div>

        <table className="w-full border-collapse border border-black text-[16px] mb-12">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 w-[8%] text-center text-[16px]">ลำดับ</th>
              <th className="border border-black p-2 w-[35%] text-center text-[16px]">ชื่อ-นามสกุล/ตำแหน่ง</th>
              <th className="border border-black p-2 w-[22%] text-center text-[16px]">ฝ่าย/แผนก</th>
              <th className="border border-black p-2 w-[12%] text-center text-[16px]">จำนวนวัน</th>
              <th className="border border-black p-2 w-[23%] text-center text-[16px]">วันที่ปฏิบัติงาน</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="border border-black p-2 text-center align-top text-[16px]">{toThaiNumerals(idx + 1)}</td>
                <td className="border border-black p-2 align-top text-[16px]">
                  <div className="font-bold text-[16px]">{item.StName}</div>
                  <div className="text-[14px]">{item.StPostName || '-'}</div>
                </td>
                <td className="border border-black p-2 text-center align-top text-[16px]">{item.DepName || '-'}</td>
                <td className="border border-black p-2 text-center align-top text-[16px] font-bold">{toThaiNumerals(item.dates.length)}</td>
                <td className="border border-black p-2 text-center align-top text-[16px]">
                  {item.dates.sort((a: number, b: number) => a - b).map((d: any) => toThaiNumerals(d)).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start mt-20">
          <div className="text-center w-80">
            <p className="mb-12 font-bold underline">เจ้าหน้าที่ผู้รวบรวม</p>
            <div className="mb-2">ลงชื่อ ............................................................</div>
            <div>( ............................................................ )</div>
          </div>
          <div className="text-center w-80">
            <p className="mb-12 font-bold underline">ผู้รับรองรายงาน</p>
            <div className="mb-2">ลงชื่อ ............................................................</div>
            <div className="font-bold">( {director?.StName || '............................................................'} )</div>
            <div className="text-xs mt-1">ผู้อำนวยการ{agencyName}</div>
          </div>
        </div>
      </div>

      {/* Condensed Printable Report */}
      <div id="printable-condensed-report" className="hidden print:block p-8 bg-white mode-condensed">
        <div className="text-center mb-6">
          <h1 className="text-[20px] font-bold mb-1">รายชื่อข้าราชการและเจ้าหน้าที่ปฏิบัติงาน ณ ที่พักอาศัย (Work From Home)</h1>
          <h2 className="text-[18px] font-bold mb-1">หน่วยงาน {agencyName}</h2>
          <h2 className="text-[16px] font-bold">ประจำเดือน {thaiMonths[selectedMonth - 1]} พ.ศ. {toThaiNumerals(selectedYear + 543)}</h2>
        </div>

        <table className="w-full border-collapse border border-black text-[16px] mb-10">
          <thead>
            <tr>
              <th className="border border-black p-1 w-8 text-center text-[16px]" rowSpan={2}>ลำดับ</th>
              <th className="border border-black p-1 w-48 text-center text-[16px]" rowSpan={2}>ชื่อ-สกุล</th>
              <th className="border border-black p-1 w-40 text-center text-[16px]" rowSpan={2}>ตำแหน่ง</th>
              <th className="border border-black p-1 text-center text-[16px]" colSpan={daysArray.length}>วันที่ปฏิบัติงาน</th>
            </tr>
            <tr>
              {daysArray.map(d => (
                <th key={d} className="border border-black p-0.5 w-5 text-center font-bold text-[16px]">{toThaiNumerals(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedData.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="border border-black p-1 text-center text-[16px]">{toThaiNumerals(idx + 1)}</td>
                <td className="border border-black p-1 font-bold text-[16px]">{item.StName}</td>
                <td className="border border-black p-1 text-center leading-tight text-[16px]">{item.StPostName || '-'}</td>
                {daysArray.map(d => (
                  <td key={d} className="border border-black p-0 text-center text-[16px]">
                    {item.dates.includes(d) ? '/' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-12 pr-10">
          <div className="text-center w-64">
            <div className="mb-8 text-[16px]">ลงชื่อ ............................................................</div>
            <div className="font-bold text-[16px]">( {director?.StName || '............................................................'} )</div>
            <div className="text-[14px] mt-1">ผู้อำนวยการ{agencyName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveReport;
