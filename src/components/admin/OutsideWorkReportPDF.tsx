import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Local Thai Font
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
    padding: 40,
    fontFamily: 'THSarabunNew'
  },
  title: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
    fontFamily: 'THSarabunNew-Bold'
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
    fontFamily: 'THSarabunNew-Bold'
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    width: '100%',
    borderLeft: '0.5pt solid #000',
  },
  tableRowHeader: {
    flexDirection: 'row',
    width: '100%',
    borderLeft: '0.5pt solid #000',
    borderTop: '0.5pt solid #000',
    backgroundColor: '#f3f4f6'
  },
  tableColHeader: {
    borderRight: '0.5pt solid #000',
    borderBottom: '0.5pt solid #000',
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tableCol: {
    borderRight: '0.5pt solid #000',
    borderBottom: '0.5pt solid #000',
    padding: 5
  },
  tableCellHeader: {
    fontSize: 12,
    fontFamily: 'THSarabunNew-Bold'
  },
  tableCell: {
    fontSize: 12
  },
  signatureSection: {
    marginTop: 40,
    marginRight: 20,
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: '50%'
  },
  signatureName: {
    fontSize: 12,
    fontFamily: 'THSarabunNew-Bold',
    marginBottom: 5
  },
  signaturePosition: {
    fontSize: 10,
    textAlign: 'center',
    width: '100%'
  }
});

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    const thaiMonthsShort = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${d} ${thaiMonthsShort[m - 1]} ${y + 543}`;
  }
  return dateStr;
};

interface OutsideWorkRecord {
  id: string;
  StID: string;
  StName: string;
  StPostName?: string;
  DepName?: string;
  work_date: string;
  hours: number;
  rate: number;
  amount: number;
  is_holiday: number;
  sort_order?: string;
}

export const OutsideWorkReportPDF = ({ data, monthName, yearThai, directorName }: { data: OutsideWorkRecord[], monthName: string, yearThai: number, directorName?: string }) => {
  // Sort by sort_order then date
  const sortedData = [...data].sort((a, b) => {
    const orderA = Number(a.sort_order || 999);
    const orderB = Number(b.sort_order || 999);
    if (orderA !== orderB) return orderA - orderB;
    return a.work_date.localeCompare(b.work_date);
  });
  
  const totalAmount = data.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.title}>หลักฐานการจ่ายเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ</Text>
          <Text style={styles.subtitle}>สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ 2</Text>
          <Text style={{ ...styles.subtitle, marginBottom: 20 }}>
            ประจำเดือน {monthName} พ.ศ. {yearThai}
          </Text>
        </View>
        
        <View style={styles.table}>
          <View style={styles.tableRowHeader} fixed>
            <View style={[styles.tableColHeader, { width: '8%' }]}>
              <Text style={styles.tableCellHeader}>ลำดับ</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '30%' }]}>
              <Text style={styles.tableCellHeader}>ชื่อ-นามสกุล</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '15%' }]}>
              <Text style={styles.tableCellHeader}>วันที่</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '10%' }]}>
              <Text style={styles.tableCellHeader}>ชม.</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '12%' }]}>
              <Text style={styles.tableCellHeader}>บาท/ชม.</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '12%' }]}>
              <Text style={styles.tableCellHeader}>จำนวนเงิน</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '13%' }]}>
              <Text style={styles.tableCellHeader}>หมายเหตุ</Text>
            </View>
          </View>

          {sortedData.map((item, index) => (
            <View style={styles.tableRow} key={index} wrap={false}>
              <View style={[styles.tableCol, { width: '8%', alignItems: 'center' }]}>
                <Text style={styles.tableCell}>{index + 1}</Text>
              </View>
              <View style={[styles.tableCol, { width: '30%' }]}>
                <Text style={styles.tableCell}>{item.StName}</Text>
              </View>
              <View style={[styles.tableCol, { width: '15%', alignItems: 'center' }]}>
                <Text style={styles.tableCell}>{formatDateThai(item.work_date)}</Text>
              </View>
              <View style={[styles.tableCol, { width: '10%', alignItems: 'center' }]}>
                <Text style={styles.tableCell}>{Number(item.hours)}</Text>
              </View>
              <View style={[styles.tableCol, { width: '12%', alignItems: 'center' }]}>
                <Text style={styles.tableCell}>{Number(item.rate)}</Text>
              </View>
              <View style={[styles.tableCol, { width: '12%', alignItems: 'flex-end' }]}>
                <Text style={styles.tableCell}>{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={[styles.tableCol, { width: '13%', alignItems: 'center' }]}>
                <Text style={styles.tableCell}>{Number(item.is_holiday) ? 'วันหยุด' : ''}</Text>
              </View>
            </View>
          ))}

          {/* Total Row */}
          <View style={styles.tableRow} wrap={false}>
            <View style={[styles.tableCol, { width: '75%', alignItems: 'flex-end' }]}>
              <Text style={styles.tableCellHeader}>รวมเงินทั้งสิ้น</Text>
            </View>
            <View style={[styles.tableCol, { width: '12%', alignItems: 'flex-end' }]}>
              <Text style={styles.tableCellHeader}>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={[styles.tableCol, { width: '13%' }]} />
          </View>
        </View>

        <View style={styles.signatureSection} wrap={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, width: '100%' }}>
            <Text style={{ fontSize: 12 }}>ลงชื่อ</Text>
            <Text style={{ fontSize: 12, marginLeft: 5 }}>............................................................</Text>
          </View>
          <Text style={styles.signatureName}>( {directorName || '............................................................'} )</Text>
          <Text style={styles.signaturePosition}>ผู้อำนวยการสำนักงานจัดหางานกรุงเทพมหานครพื้นที่ 2</Text>
        </View>

        <Text 
          style={{ 
            position: 'absolute', 
            bottom: 20, 
            left: 0, 
            right: 0, 
            textAlign: 'center', 
            fontSize: 10, 
            color: '#666' 
          }} 
          render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`} 
          fixed 
        />
      </Page>
    </Document>
  );
};
