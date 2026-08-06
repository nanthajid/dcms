import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Thai Font
Font.register({
  family: 'THSarabunNew',
  src: '/dcms/THSarabunNew.ttf'
});
Font.register({
  family: 'THSarabunNew-Bold',
  src: '/dcms/THSarabunNew-Bold.ttf'
});

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'THSarabunNew'
  },
  headerContainer: {
    marginBottom: 10,
    alignItems: 'center'
  },
  title: {
    fontSize: 14,
    fontFamily: 'THSarabunNew-Bold',
    textAlign: 'center',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'THSarabunNew-Bold',
    textAlign: 'center',
    marginBottom: 5
  },
  table: {
    width: '100%',
  },
  // Table Rows
  row: {
    flexDirection: 'row',
    borderColor: '#000',
    minHeight: 22,
  },
  headerRow: {
    flexDirection: 'row',
    borderTopWidth: 0.6,
    borderColor: '#000',
    minHeight: 55,
  },
  // Column Styles
  colNo: { width: '2.5%', borderLeftWidth: 0.6, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  colName: { width: '15%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', paddingLeft: 2 },
  colRate: { width: '3.5%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  colDaysGroup: { width: '49%', borderRightWidth: 0.6, borderColor: '#000' },
  colTotalHr: { width: '4.5%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  colAmount: { width: '4.5%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 2 },
  colDateRecv: { width: '6%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  colSign: { width: '6%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  colNote: { width: '4.5%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },


  // Cells
  cellHeader: {
    fontSize: 7.5,
    fontFamily: 'THSarabunNew-Bold',
    textAlign: 'center',
    paddingHorizontal: 1,
    paddingVertical: 1
  },
  cellHeaderDay: {
    fontSize: 6.5,
    fontFamily: 'THSarabunNew-Bold',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 7.5,
    textAlign: 'center',
    paddingVertical: 2
  },
  cellTextLeft: {
    fontSize: 7.5,
    textAlign: 'left',
    paddingVertical: 2
  },
  cellTextRight: {
    fontSize: 7.5,
    textAlign: 'right',
    paddingVertical: 2
  },
  cellDayText: {
    fontSize: 6.5,
    textAlign: 'center',
  },

  // Footer
  footerSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10
  },
  signatureBox: {
    width: '30%',
    alignItems: 'center'
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    width: '80%',
    marginTop: 15,
    marginBottom: 5
  },
  signatureText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'center'
  }
});

interface OTData {
  employeeName: string;
  rate: string; // Changed to string to support "50, 60"
  otByDay: { [key: string]: number }; 
  normalHours: number;
  holidayHours: number;
  totalAmount: number;
}

// Thai Baht Text Conversion Utility
const thaiBahtText = (num: number): string => {
  const numberText = [
    "ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"
  ];
  const digitText = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  if (num === 0) return "ศูนย์บาทถ้วน";

  const numStr = Math.floor(num).toString();
  let result = "";

  for (let i = 0; i < numStr.length; i++) {
    const n = parseInt(numStr[i]);
    const pos = numStr.length - i - 1;

    if (n !== 0) {
      if (pos % 6 === 1 && n === 1) {
        result += "";
      } else if (pos % 6 === 1 && n === 2) {
        result += "ยี่";
      } else if (pos % 6 === 0 && n === 1 && i > 0) {
        result += "เอ็ด";
      } else {
        result += numberText[n];
      }
      result += digitText[pos % 6];
    }
    if (pos !== 0 && pos % 6 === 0) {
      result += "ล้าน";
    }
  }

  result += "บาท";

  const decimal = Math.round((num % 1) * 100);
  if (decimal === 0) {
    result += "ถ้วน";
  } else {
    if (decimal === 1) result += "หนึ่งสตางค์";
    else if (decimal === 2) result += "สองสตางค์"; // simplified for most cases
    else {
      // Basic decimal handling for common cases
      const d1 = Math.floor(decimal / 10);
      const d2 = decimal % 10;
      if (d1 > 0) {
        if (d1 === 1) result += "สิบ";
        else if (d1 === 2) result += "ยี่สิบ";
        else result += numberText[d1] + "สิบ";
      }
      if (d2 > 0) {
        if (d2 === 1 && d1 > 0) result += "เอ็ด";
        else result += numberText[d2];
      }
      result += "สตางค์";
    }
  }

  return result;
};

export const OutsideWorkSummaryPDF = ({
  data,
  monthName,
  yearThai,
  daysInMonth = 31,
  startDay,
  endDay,
  year,
  month,
  holidays = [],
  agencyName = "สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ 2",
  approverTitle = "",
  approverName = "สวลี พันธ์ศรี",
  approverPostName = "นักวิชาการแรงงานชำนาญการพิเศษ",
  reportTitle = "หลักฐานการเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ"
}: {
  data: OTData[],
  monthName: string,
  yearThai: number,
  daysInMonth?: number,
  startDay?: number,
  endDay?: number,
  year: number,
  month: number,
  holidays?: any[],
  agencyName?: string,
  approverTitle?: string,
  approverName?: string,
  approverPostName?: string,
  reportTitle?: string
}) => {
  // ตารางแสดงคอลัมน์ครบทุกวันของเดือนเสมอ ส่วน startDay/endDay ใช้บอกช่วงที่หัวรายงาน
  // วันที่อยู่นอกช่วงจะไม่มีข้อมูลใน otByDay (ถูกกรองออกตั้งแต่ต้นทาง) จึงแสดงเป็น "-" เอง
  const firstDay = Math.max(1, startDay ?? 1);
  const lastDay = Math.min(daysInMonth, endDay ?? daysInMonth);

  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  const totalAllAmount = data.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalNormalHours = data.reduce((sum, item) => sum + (item.normalHours || 0), 0);
  const totalHolidayHours = data.reduce((sum, item) => sum + (item.holidayHours || 0), 0);
  const bahtText = thaiBahtText(totalAllAmount);

  // Helper to check if a day is weekend or holiday
  const checkIsHoliday = (day: string) => {
    const date = new Date(year, month - 1, parseInt(day));
    const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
    return holidays.some(h => h.holiday_date === dateStr);
  };

  // Dynamic width for day columns
  const dayColWidth = 100 / daysInMonth;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer} fixed>
          <Text style={styles.title}>{reportTitle}</Text>
          <Text style={styles.subtitle}>ชื่อส่วนราชการ {agencyName}</Text>
          <Text style={styles.subtitle}>วันที่ {firstDay} - {lastDay} {monthName} {yearThai}</Text>
        </View>

        <View style={styles.table}>
          {/* Header Row 1 */}
          <View style={styles.headerRow} fixed>
            <View style={styles.colNo}><Text style={[styles.cellHeader, { fontSize: 6, lineHeight: 1.2 }]}>ลำดับ{"\n"}ที่</Text></View>
            <View style={styles.colName}><Text style={styles.cellHeader}>ชื่อ - สกุล</Text></View>
            <View style={styles.colRate}><Text style={[styles.cellHeader, { fontSize: 6, lineHeight: 1.2 }]}>อัตรา{"\n"}ค่าตอบแทน</Text></View>
            
            <View style={styles.colDaysGroup}>
              <View style={{ borderBottomWidth: 0.6, borderColor: '#000', flex: 1, justifyContent: 'center' }}>
                <Text style={styles.cellHeader}>วันที่ที่ปฏิบัติงานนอกเวลาราชการ</Text>
              </View>
              <View style={{ flexDirection: 'row', height: 18 }}>
                {days.map((d, i) => {
                  const isHoli = checkIsHoliday(d);
                  return (
                    <View key={d} style={{ 
                      width: `${dayColWidth}%`, 
                      borderRightWidth: i === days.length - 1 ? 0 : 0.6, 
                      borderBottomWidth: 0.6,
                      borderColor: '#000', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: isHoli ? '#D6EAF8' : 'transparent',
                      height: '100%'
                    }}>
                      <Text style={styles.cellHeaderDay}>{d}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ width: '9%', borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#000' }}>
              <View style={{ borderBottomWidth: 0.6, borderColor: '#000', flex: 1, justifyContent: 'center' }}>
                <Text style={styles.cellHeader}>รวมเวลาปฏิบัติงาน</Text>
              </View>
              <View style={{ flexDirection: 'row', height: 18 }}>
                <View style={{ width: '50%', borderRightWidth: 0.6, borderColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[styles.cellHeader, { fontSize: 5.5, lineHeight: 1.1, paddingHorizontal: 0 }]}>วันปกติ{"\n"}(ชม.)</Text>
                </View>
                <View style={{ width: '50%', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[styles.cellHeader, { fontSize: 5.5, lineHeight: 1.1, paddingHorizontal: 0 }]}>วันหยุด{"\n"}(ชม.)</Text>
                </View>
              </View>
            </View>
            <View style={styles.colAmount}><Text style={[styles.cellHeader, { fontSize: 6.5, lineHeight: 1.2 }]}>จำนวนเงิน</Text></View>
            <View style={styles.colDateRecv}><Text style={[styles.cellHeader, { fontSize: 6, lineHeight: 1.2 }]}>วัน/เดือน/ปี{"\n"}ผู้รับเงิน</Text></View>
            <View style={styles.colSign}><Text style={[styles.cellHeader, { fontSize: 6, lineHeight: 1.2 }]}>ลายมือชื่อ{"\n"}ผู้รับเงิน</Text></View>
            <View style={styles.colNote}><Text style={[styles.cellHeader, { fontSize: 6.5, lineHeight: 1.2 }]}>หมายเหตุ</Text></View>
          </View>

          {/* Data Rows */}
          {data.map((item, index) => (
            <View style={styles.row} key={index} wrap={false}>
              <View style={styles.colNo}><Text style={styles.cellText}>{index + 1}</Text></View>
              <View style={styles.colName}><Text style={styles.cellTextLeft}>{item.employeeName}</Text></View>
              <View style={styles.colRate}><Text style={styles.cellText}>{item.rate}</Text></View>
              
              <View style={styles.colDaysGroup}>
                <View style={{ flexDirection: 'row', flex: 1 }}>
                  {days.map((d, i) => {
                    const hours = item.otByDay[d];
                    const isHoli = checkIsHoliday(d);
                    return (
                      <View key={d} style={{ 
                        width: `${dayColWidth}%`, 
                        borderRightWidth: i === days.length - 1 ? 0 : 0.6, 
                        borderBottomWidth: 0.6,
                        borderColor: '#000', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        backgroundColor: isHoli ? '#D6EAF8' : 'transparent',
                        height: '100%'
                      }}>
                        <Text style={styles.cellDayText}>{hours > 0 ? hours : '-'}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.colTotalHr}><Text style={styles.cellText}>{item.normalHours ? item.normalHours.toLocaleString() : '-'}</Text></View>
              <View style={styles.colTotalHr}><Text style={styles.cellText}>{item.holidayHours ? item.holidayHours.toLocaleString() : '-'}</Text></View>
              <View style={styles.colAmount}>
                <Text style={styles.cellTextRight}>{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</Text>
              </View>
              <View style={styles.colDateRecv}><Text style={styles.cellText}></Text></View>
              <View style={styles.colSign}><Text style={styles.cellText}></Text></View>
              <View style={styles.colNote}><Text style={styles.cellText}></Text></View>
            </View>
          ))}

          {/* Footer Row */}
          <View style={{ flexDirection: 'row', minHeight: 20 }} wrap={false}>
            <View style={[styles.colNo, { borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]} />
            <View style={{ width: '67.5%', borderRightWidth: 0.6, borderBottomWidth: 0, borderColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={[styles.cellText, { fontFamily: 'THSarabunNew-Bold' }]}></Text>
            </View>
            <View style={styles.colTotalHr}>
              <Text style={styles.cellText}>{totalNormalHours ? totalNormalHours.toLocaleString() : '-'}</Text>
            </View>
            <View style={styles.colTotalHr}>
              <Text style={styles.cellText}>{totalHolidayHours ? totalHolidayHours.toLocaleString() : '-'}</Text>
            </View>
            <View style={[styles.colAmount, { borderRightWidth: 1 }]}>
              <Text style={styles.cellTextRight}>{totalAllAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={[styles.colDateRecv, { borderBottomWidth: 0, borderRightWidth: 0 }]} />
            <View style={[styles.colSign, { borderBottomWidth: 0, borderRightWidth: 0 }]} />
            <View style={[styles.colNote, { borderBottomWidth: 0, borderRightWidth: 0 }]} />
          </View>
        </View>

        {/* Thai Government Style Footer */}
        <View style={{ marginTop: 5, paddingHorizontal: 20 }} wrap={false}>
          <View style={{ flexDirection: 'column' }}>
            {/* Top Section */}
            <View>
              <View style={{ flexDirection: 'row', marginBottom: 5 }}>
                <Text style={{ fontSize: 9 }}>รวมเงินจ่ายทั้งสิ้น(ตัวอักษร) (</Text>
                <Text style={{ fontSize: 9, textDecoration: 'underline' }}>{bahtText}</Text>
                <Text style={{ fontSize: 9 }}>)</Text>
              </View>
              <Text style={{ fontSize: 9, marginBottom: 10 }}>
                ขอรับรองว่าผู้มีรายชื่อข้างต้นปฏิบัติงานนอกเวลาจริง
              </Text>
            </View>

            {/* Signature Section - Inline */}
            <View style={{ marginTop: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
              {/* Approver */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                  <Text style={{ fontSize: 8, width: 40 }}>ลงชื่อ</Text>
                  <View style={{ flex: 1, borderBottomWidth: 0.6, borderBottomColor: '#000', marginHorizontal: 5, height: 8 }} />
                  <Text style={{ fontSize: 8, width: 90 }}>ผู้รับรองการปฏิบัติงาน</Text>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <View style={{ width: 40 }} />
                  <View style={{ flex: 1, marginHorizontal: 5, alignItems: 'center' }}>
                    <Text style={{ fontSize: 8 }}>({approverTitle}{approverName})</Text>
                  </View>
                  <View style={{ width: 90 }} />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ width: 40 }} />
                  <View style={{ flex: 1, marginHorizontal: 5, alignItems: 'center' }}>
                    <Text style={{ fontSize: 8 }}>{approverPostName}</Text>
                  </View>
                  <View style={{ width: 90 }} />
                </View>
              </View>





              {/* Payer */}
              <View style={{ flex: 1, marginLeft: '35%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                  <Text style={{ fontSize: 8 }}>ลงชื่อ</Text>
                  <View style={{ width: 100, borderBottomWidth: 0.6, borderBottomColor: '#000', marginHorizontal: 5, height: 8 }} />
                  <Text style={{ fontSize: 8 }}>ผู้จ่ายเงิน</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
