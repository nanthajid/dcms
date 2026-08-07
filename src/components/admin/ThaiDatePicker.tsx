import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('th', th);

/**
 * ช่องเลือกวันที่แบบไทย — เดือนไทยเต็ม + ปี พ.ศ. ทั้งในช่องกรอกและหัวปฏิทิน
 *
 * locale 'th' ของ date-fns ให้แค่ชื่อเดือน/วันเป็นไทย ปียังเป็น ค.ศ. อยู่
 * จึงต้องคุมหัวปฏิทินเองด้วย renderCustomHeader และเขียนข้อความในช่องเองผ่าน value
 *
 * ค่าที่รับ/ส่งเป็นสตริง 'YYYY-MM-DD' (ค.ศ.) ให้ตรงกับที่ MySQL เก็บ
 * แปลงเป็น พ.ศ. เฉพาะตอนแสดงผลเท่านั้น
 */

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** 'YYYY-MM-DD' -> Date (อ่านทีละส่วน ไม่ผ่าน Date.parse ที่ตีความ ISO เป็น UTC แล้ววันเพี้ยน) */
const parseISO = (v: string | null | undefined): Date | null => {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

/** Date -> 'YYYY-MM-DD' ตามเวลาท้องถิ่น (toISOString จะเลื่อนวันตาม timezone) */
const toISO = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** 2026-06-15 -> '15 มิ.ย. 2569' */
export const formatThai = (v: string | null | undefined): string => {
  const d = parseISO(v);
  if (!d) return '';
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

interface ThaiDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** ห้ามเลือกก่อนวันนี้ (ใช้กับวันที่สิ้นสุดให้ไม่มาก่อนวันที่เริ่ม) */
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  /** จำนวนปีย้อนหลัง/ล่วงหน้าที่ให้เลือกใน dropdown */
  yearsBack?: number;
  yearsForward?: number;
}

const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'เลือกวันที่...',
  className = '',
  minDate,
  maxDate,
  disabled = false,
  yearsBack = 10,
  yearsForward = 5,
}) => {
  const selected = parseISO(value);
  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = thisYear + yearsForward; y >= thisYear - yearsBack; y--) years.push(y);

  return (
    <div className="relative thai-datepicker">
      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none z-10">
        <CalendarIcon size={17} />
      </span>

      <DatePicker
        selected={selected}
        onChange={(d: Date | null) => onChange(d ? toISO(d) : '')}
        locale="th"
        // เขียนข้อความเองเพราะ date-fns ไม่มีรูปแบบ พ.ศ. ในตัว
        value={formatThai(value)}
        placeholderText={placeholder}
        minDate={parseISO(minDate) ?? undefined}
        maxDate={parseISO(maxDate) ?? undefined}
        disabled={disabled}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        // fixed = ไม่ถูก overflow ของ modal ที่เลื่อนได้ตัดขอบทิ้ง
        popperProps={{ strategy: 'fixed' }}
        className={
          className ||
          'w-full pl-10 pr-9 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary bg-gray-50'
        }
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex items-center justify-between gap-1 px-2 py-2">
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="เดือนก่อนหน้า"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={date.getMonth()}
                onChange={e => changeMonth(Number(e.target.value))}
                className="text-sm font-bold text-gray-700 bg-transparent border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {THAI_MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={date.getFullYear()}
                onChange={e => changeYear(Number(e.target.value))}
                className="text-sm font-bold text-gray-700 bg-transparent border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {years.map(y => (
                  // value เป็น ค.ศ. ตามที่ react-datepicker ต้องการ แสดงเป็น พ.ศ.
                  <option key={y} value={y}>
                    {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="เดือนถัดไป"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      />

      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-red-500 transition-colors z-10"
          title="ล้างวันที่"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

export default ThaiDatePicker;
