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
