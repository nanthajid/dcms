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
    padding: 20,
    fontFamily: 'THSarabunNew'
  },
  headerContainer: {
    marginBottom: 10,
    alignItems: 'center'
  },
  title: {
    fontSize: 16,
    fontFamily: 'THSarabunNew-Bold',
    textAlign: 'center',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'THSarabunNew-Bold',
    textAlign: 'center',
    marginBottom: 5
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 0.5,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#000',
    minHeight: 30,
  },
  tableRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#000',
    backgroundColor: '#f8f8f8',
    minHeight: 50,
  },
  tableCol: {
    borderRightWidth: 0.5,
    borderColor: '#000',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tableColLast: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tableCellHeader: {
    fontSize: 9,
    fontFamily: 'THSarabunNew-Bold',
    textAlign: 'center'
  },
  tableCell: {
    fontSize: 8,
    textAlign: 'center'
  },
  tableCellLeft: {
    fontSize: 8,
    textAlign: 'left',
    paddingLeft: 4
  },
  tableCellRight: {
    fontSize: 8,
    textAlign: 'right',
    paddingRight: 4
  },
  tableCellSmall: {
    fontSize: 7,
    textAlign: 'center'
  },
  dayBox: {
    width: 11,
    height: 14,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    width: '100%',
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: '#000',
  },
  footerSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  signatureBox: {
    width: '32%',
    alignItems: 'center'
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    width: '80%',
    marginTop: 15,
    marginBottom: 5
  }
});

interface OutsideWorkRecord {
  id: string;
  StID: string;
  StName: string;
  StPostName?: string;
  work_date: string;
  hours: number;
  rate: number;
  amount: number;
  is_holiday: number;
  reason: string;
  sort_order?: string;
}

interface WorkRecord {
  day: number;
  hours: number;
  isHoliday: boolean;
}

interface GroupedData {
  StID: string;
  StName: string;
  StPostName: string;
  allRecords: WorkRecord[];
  totalAmount: number;
  totalNormalHours: number;
  totalHolidayHours: number;
  rate: number;
  sort_order?: string;
}

export const OutsideWorkJasperReportPDF = ({ data, monthName, yearThai, directorName }: { data: OutsideWorkRecord[], monthName: string, yearThai: number, directorName?: string }) => {
  // Group data by StID
  const grouped = data.reduce((acc, curr) => {
    if (!acc[curr.StID]) {
      acc[curr.StID] = {
        StID: curr.StID,
        StName: curr.StName,
        StPostName: curr.StPostName || '-',
        allRecords: [],
        totalAmount: 0,
        totalNormalHours: 0,
        totalHolidayHours: 0,
        rate: Number(curr.rate),
        sort_order: curr.sort_order
      };
    }
    
    const day = parseInt(curr.work_date.split('-')[2]);
    const h = Number(curr.hours);
    acc[curr.StID].allRecords.push({ 
      day, 
      hours: h,
      isHoliday: Boolean(Number(curr.is_holiday))
    });

    if (Number(curr.is_holiday)) {
      acc[curr.StID].totalHolidayHours += h;
    } else {
      acc[curr.StID].totalNormalHours += h;
    }
    
    acc[curr.StID].totalAmount += Number(curr.amount);
    
    return acc;
  }, {} as Record<string, GroupedData>);

  const groupedArray = Object.values(grouped).sort((a, b) => {
    return Number(a.sort_order || 999) - Number(b.sort_order || 999);
  });
  
  // Sort records for each staff
  groupedArray.forEach(item => {
    item.allRecords.sort((a, b) => a.day - b.day);
  });

  const overallTotal = data.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>หลักฐานการจ่ายเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ</Text>
          <Text style={styles.subtitle}>ส่วนราชการ สำนักงานจัดหางานกรุงเทพมหานครพื้นที่ 2</Text>
          <Text style={styles.subtitle}>ประจำเดือน {monthName} พ.ศ. {yearThai}</Text>
        </View>

        <View style={styles.table}>
          {/* Header Rows */}
          <View style={styles.tableRowHeader} fixed>
            <View style={[styles.tableCol, { width: '3%' }]}><Text style={styles.tableCellHeader}>ลำดับ</Text></View>
            <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCellHeader}>ชื่อ-นามสกุล</Text></View>
            <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCellHeader}>ตำแหน่ง</Text></View>
            <View style={[styles.tableCol, { width: '22%' }]}><Text style={styles.tableCellHeader}>วันที่ปฏิบัติงาน</Text></View>
            <View style={[styles.tableCol, { width: '22%', padding: 0 }]}>
              <View style={{ width: '100%', borderBottomWidth: 0.5, borderColor: '#000', padding: 1 }}>
                <Text style={styles.tableCellHeader}>จำนวนชั่วโมงที่ปฏิบัติงาน</Text>
              </View>
              <View style={{ flexDirection: 'row', width: '100%' }}>
                <View style={{ flex: 1, borderRightWidth: 0.5, borderColor: '#000', padding: 1 }}><Text style={styles.tableCellHeader}>วันทำการ</Text></View>
                <View style={{ flex: 1, padding: 1 }}><Text style={styles.tableCellHeader}>วันหยุดราชการ</Text></View>
              </View>
            </View>
            <View style={[styles.tableCol, { width: '4%' }]}><Text style={styles.tableCellHeader}>รวม ชม.</Text></View>
            <View style={[styles.tableCol, { width: '4%' }]}><Text style={styles.tableCellHeader}>อัตรา</Text></View>
            <View style={[styles.tableCol, { width: '6%' }]}><Text style={styles.tableCellHeader}>จำนวนเงิน</Text></View>
            <View style={[styles.tableCol, { width: '11%' }]}><Text style={styles.tableCellHeader}>ลายมือชื่อผู้รับเงิน</Text></View>
            <View style={[styles.tableColLast, { width: '8%' }]}><Text style={styles.tableCellHeader}>หมายเหตุ</Text></View>
          </View>

          {/* Data Rows */}
          {groupedArray.map((item, index) => (
            <View style={styles.tableRow} key={index} wrap={false}>
              <View style={[styles.tableCol, { width: '3%' }]}><Text style={styles.tableCell}>{index + 1}</Text></View>
              <View style={[styles.tableCol, { width: '10%', alignItems: 'flex-start' }]}><Text style={styles.tableCellLeft}>{item.StName}</Text></View>
              <View style={[styles.tableCol, { width: '10%', alignItems: 'flex-start' }]}><Text style={styles.tableCellLeft}>{item.StPostName}</Text></View>
              
              <View style={[styles.tableCol, { width: '22%', padding: 2, alignItems: 'flex-start' }]}>
                <View style={styles.gridRow}>
                  {item.allRecords.map((rec, i) => (
                    <View key={`d-${i}`} style={styles.dayBox}>
                      <Text style={[styles.tableCellSmall, { fontFamily: rec.isHoliday ? 'THSarabunNew-Bold' : 'THSarabunNew' }]}>{rec.day}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.tableCol, { width: '22%', padding: 0 }]}>
                <View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>
                  <View style={{ flex: 1, borderRightWidth: 0.5, borderColor: '#000', padding: 2, alignItems: 'flex-start' }}>
                    <View style={styles.gridRow}>
                      {item.allRecords.filter(r => !r.isHoliday).map((rec, i) => (
                        <View key={`nh-${i}`} style={styles.dayBox}>
                          <Text style={styles.tableCellSmall}>{rec.hours}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={{ flex: 1, padding: 2, alignItems: 'flex-start' }}>
                    <View style={styles.gridRow}>
                      {item.allRecords.filter(r => r.isHoliday).map((rec, i) => (
                        <View key={`hh-${i}`} style={styles.dayBox}>
                          <Text style={styles.tableCellSmall}>{rec.hours}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              <View style={[styles.tableCol, { width: '4%' }]}><Text style={styles.tableCell}>{item.totalNormalHours + item.totalHolidayHours}</Text></View>
              <View style={[styles.tableCol, { width: '4%' }]}><Text style={styles.tableCell}>{item.rate}</Text></View>
              <View style={[styles.tableCol, { width: '6%' }]}>
                <Text style={styles.tableCellRight}>{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={[styles.tableCol, { width: '11%' }]}><Text style={styles.tableCell}></Text></View>
              <View style={[styles.tableColLast, { width: '8%' }]}><Text style={styles.tableCell}></Text></View>
            </View>
          ))}

          {/* Summary Row */}
          <View style={styles.tableRow} wrap={false}>
            <View style={[styles.tableCol, { width: '3%', borderLeftWidth: 0, borderRightWidth: 0 }]} />
            <View style={[styles.tableCol, { width: '72%', alignItems: 'flex-end' }]}>
              <Text style={[styles.tableCellHeader, { marginRight: 10 }]}>รวมเงินทั้งสิ้น</Text>
            </View>
            <View style={[styles.tableCol, { width: '6%', borderRightWidth: 1 }]}>
              <Text style={styles.tableCellRight}>{overallTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={[styles.tableCol, { width: '11%', borderRightWidth: 0 }]} />
            <View style={[styles.tableColLast, { width: '8%' }]} />
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 12, fontFamily: 'THSarabunNew-Bold' }}>คำรับรอง</Text>
            <Text style={{ fontSize: 11, marginTop: 5 }}>ได้ตรวจสอบแล้วการปฏิบัติงานนอกเวลาราชการนี้เป็นไปตามคำสั่งจริง</Text>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 12 }}>( {directorName || '............................................................'} )</Text>
            <Text style={{ fontSize: 11 }}>ผู้อำนวยการสำนักงานจัดหางานกรุงเทพมหานครพื้นที่ 2</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 12, fontFamily: 'THSarabunNew-Bold' }}>เจ้าหน้าที่ผู้รับเงิน</Text>
            <Text style={{ fontSize: 11, marginTop: 5 }}>ได้รับเงินตามรายการข้างต้นไว้เป็นการถูกต้องแล้ว</Text>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 12 }}>รวมจำนวน {groupedArray.length} ราย</Text>
            <Text style={{ fontSize: 11 }}>เป็นเงิน {overallTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 12, fontFamily: 'THSarabunNew-Bold' }}>ผู้จ่ายเงิน</Text>
            <Text style={{ fontSize: 11, marginTop: 5 }}>ได้จ่ายเงินตามรายการข้างต้นเรียบร้อยแล้ว</Text>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 12 }}>( ............................................................ )</Text>
            <Text style={{ fontSize: 11 }}>ตำแหน่ง ............................................................</Text>
          </View>
        </View>

        <Text 
          style={{ 
            position: 'absolute', 
            bottom: 10, 
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
