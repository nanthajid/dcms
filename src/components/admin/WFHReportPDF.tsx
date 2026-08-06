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
    borderTop: '0.5pt solid #000', // Added top border for fixed header
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
  tableColNoPadding: {
    borderRight: '0.5pt solid #000',
    borderBottom: '0.5pt solid #000',
    padding: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  tableCellHeader: {
    fontSize: 12,
    fontFamily: 'THSarabunNew-Bold'
  },
  tableCell: {
    fontSize: 12
  },
  innerDateRow: {
    borderBottom: '0.5pt solid #000',
    padding: 5,
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%'
  },
  innerDateRowLast: {
    padding: 5,
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%'
  },
  signatureSection: {
    marginTop: 40,
    marginRight: 20,
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: '50%'
  },
  signatureLine: {
    fontSize: 12,
    marginBottom: 10
  },
  signatureName: {
    fontSize: 12,
    fontFamily: 'THSarabunNew-Bold',
    marginBottom: 5
  },
  signaturePosition: {
    fontSize: 10, // Reduced from 12 to ensure it fits on one line
    textAlign: 'center',
    width: '100%'
  }
});

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return '';
  // Support YYYY-MM-DD and YYYY-MM-DD HH:mm:ss
  const dateOnly = dateStr.split(' ')[0];
  const parts = dateOnly.split('-');
  
  if (parts.length === 3) {
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    if (!isNaN(y)) {
      return `วันที่ ${d} ${thaiMonths[m - 1]} ${y + 543}`;
    }
  }
  return dateStr;
};

interface WFHRecord {
  id: string;
  StID: string;
  StName: string;
  StPostName?: string;
  DepName?: string;
  DepNo?: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export const WFHReportPDF = ({ data, monthName, yearThai, directorName }: { data: WFHRecord[], monthName: string, yearThai: number, directorName?: string }) => {
  // Group data by StID
  const groupedData = data.reduce((acc, curr) => {
    if (!acc[curr.StID]) {
      acc[curr.StID] = {
        StID: curr.StID,
        StName: curr.StName,
        StPostName: curr.StPostName,
        DepNo: curr.DepNo || '',
        dates: []
      };
    }
    
    const dateStr = curr.start_date === curr.end_date 
      ? formatDateThai(curr.start_date) 
      : `${formatDateThai(curr.start_date)} ถึง ${formatDateThai(curr.end_date)}`;
      
    acc[curr.StID].dates.push(dateStr);
    return acc;
  }, {} as Record<string, { StID: string, StName: string, StPostName?: string, DepNo: string, dates: string[] }>);

  // Convert to array and sort by DepNo
  const groupedArray = Object.values(groupedData).sort((a, b) => {
    return (a.DepNo || '').localeCompare(b.DepNo || '');
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section (Title & Subtitle) - Only on first page */}
        <View>
          <Text style={styles.title}>รายชื่อข้าราชการและเจ้าหน้าที่ปฏิบัติงาน ณ ที่พักอาศัย (Work From Home)</Text>
          <Text style={styles.subtitle}>
            หน่วยงาน สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ ๒
          </Text>
          <Text style={{ ...styles.subtitle, marginBottom: 20 }}>
            ประจำเดือน {monthName} พ.ศ. {yearThai}
          </Text>
        </View>
        
        <View style={styles.table}>
          {/* Header Row (Repeating on each page) */}
          <View style={styles.tableRowHeader} fixed>
            <View style={[styles.tableColHeader, { width: '10%' }]}>
              <Text style={styles.tableCellHeader}>ลำดับที่</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '50%' }]}>
              <Text style={styles.tableCellHeader}>ชื่อ-นามสกุล/ตำแหน่ง</Text>
            </View>
            <View style={[styles.tableColHeader, { width: '40%' }]}>
              <Text style={styles.tableCellHeader}>วันที่ปฏิบัติงาน</Text>
            </View>
          </View>

          {/* Data Rows */}
          {groupedArray.map((item, index) => (
            <View style={styles.tableRow} key={index} wrap={false}>
              <View style={[styles.tableCol, { width: '10%', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={styles.tableCell}>{index + 1}</Text>
              </View>
              <View style={[styles.tableCol, { width: '50%', justifyContent: 'center' }]}>
                <Text style={styles.tableCell}>{item.StName}</Text>
                <Text style={{ ...styles.tableCell, fontSize: 10, marginTop: 2, color: '#444' }}>{item.StPostName || '-'}</Text>
              </View>
              <View style={[styles.tableColNoPadding, { width: '40%' }]}>
                {item.dates.map((dateStr, dIndex) => (
                  <View 
                    key={dIndex} 
                    style={dIndex === item.dates.length - 1 ? styles.innerDateRowLast : styles.innerDateRow}
                  >
                    <Text style={{ ...styles.tableCell, textAlign: 'center' }}>{dateStr}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Signature Section - Only on the last page */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, width: '100%' }}>
            <Text style={{ fontSize: 12 }}>ลงชื่อ</Text>
            <Text style={{ fontSize: 12, marginLeft: 5 }}>............................................................</Text>
          </View>
          <Text style={styles.signatureName}>( {directorName || '............................................................'} )</Text>
          <Text style={styles.signaturePosition}>ผู้อำนวยการสำนักงานจัดหางานกรุงเทพมหานครพื้นที่ 2</Text>
        </View>

        {/* Footer / Page Number */}
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
