// eslint-disable-next-line @typescript-eslint/no-require-imports
const adbs = require('ad-bs-converter') as {
  ad2bs: (date: string) => { en: { year: number; month: number; day: number; totalDaysInMonth: number }; np: { year: number; month: number; day: number } };
  bs2ad: (date: string) => { year: number; month: number; day: number; dayOfWeek: number };
};

export const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", 
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

export const NEPALI_MONTHS_NE = [
  "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", 
  "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"
];

export const NEPALI_WEEKDAYS = [
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
];

export function adToBs(date: Date | string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return {
      year: 0,
      month: 1,
      day: 1,
      monthName: ""
    };
  }
  const formatted = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  const converted = adbs.ad2bs(formatted);
  if (!converted || !converted.en) {
    return { year: 0, month: 1, day: 1, monthName: "" };
  }
  return {
    year: converted.en.year,
    month: converted.en.month, // 1-indexed
    day: converted.en.day,
    monthName: NEPALI_MONTHS[converted.en.month - 1]
  };
}

export function bsToAd(year: number, month: number, day: number) {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
  const converted = adbs.bs2ad(formatted);
  return new Date(converted.year, converted.month - 1, converted.day);
}

export function getCurrentNepaliDate() {
  return adToBs(new Date());
}

export function getStartDayOfMonth(year: number, month: number) {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/01`;
  const converted = adbs.bs2ad(formatted);
  return converted.dayOfWeek;
}

export function getDaysInMonth(year: number, month: number) {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/01`;
  const ad = adbs.bs2ad(formatted);
  const bs = adbs.ad2bs(`${ad.year}/${ad.month}/${ad.day}`);
  return bs.en.totalDaysInMonth;
}

export function parseNepaliMonth(monthStr: string) {
  const [name, yearStr] = monthStr.split(" ");
  const monthIndex = NEPALI_MONTHS.findIndex(m => m.toLowerCase() === name.toLowerCase());
  return {
    month: monthIndex + 1,
    year: parseInt(yearStr)
  };
}

export function getPreviousNepaliMonth(monthStr: string) {
  const { month, year } = parseNepaliMonth(monthStr);
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  return `${NEPALI_MONTHS[prevMonth - 1]} ${prevYear}`;
}

export function getNextNepaliMonth(monthStr: string) {
  const { month, year } = parseNepaliMonth(monthStr);
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = year + 1;
  }
  return `${NEPALI_MONTHS[nextMonth - 1]} ${nextYear}`;
}

/**
 * Generates a range of Nepali years in descending order.
 * @param startYear The earliest year to include
 * @param endOffset Years to add beyond the current year (default: 3)
 */
export function getNepaliYearRange(startYear: number, endOffset: number = 3) {
  const current = getCurrentNepaliDate();
  const endYear = current.year + endOffset;
  
  const years = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }
  return years;
}

export function compareNepaliMonths(m1: string, m2: string): number {
  const p1 = parseNepaliMonth(m1);
  const p2 = parseNepaliMonth(m2);
  if (p1.year !== p2.year) {
    return p1.year - p2.year;
  }
  return p1.month - p2.month;
}

export function getNepaliMonthRange(startMonthStr: string, endMonthStr: string): string[] {
  const months: string[] = [];
  let current = startMonthStr;
  let count = 0;
  while (compareNepaliMonths(current, endMonthStr) <= 0 && count < 240) {
    months.push(current);
    current = getNextNepaliMonth(current);
    count++;
  }
  return months;
}

export function getNepaliMonthStartAd(year: number, month: number): Date {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/01`;
  const converted = adbs.bs2ad(formatted);
  const utcDate = new Date(Date.UTC(converted.year, converted.month - 1, converted.day, 0, 0, 0, 0));
  // Shift by -5 hours and 45 minutes to align with Nepal Time (UTC+5:45)
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() - (5 * 60 + 45));
  return utcDate;
}

export function getNepaliMonthEndAd(year: number, month: number): Date {
  let nextM = month + 1;
  let nextY = year;
  if (nextM > 12) {
    nextM = 1;
    nextY++;
  }
  const nextMonthStart = getNepaliMonthStartAd(nextY, nextM);
  // Subtract 1ms to get the end of the target month
  nextMonthStart.setUTCMilliseconds(nextMonthStart.getUTCMilliseconds() - 1);
  return nextMonthStart;
}

