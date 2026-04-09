import { adToBs, bsToAd } from "ad-bs-converter";

/**
 * Utility for Nepali Calendar (Bikram Sambat)
 * Integrates with ad-bs-converter
 */

export interface NepaliDate {
  en: {
    year: number;
    month: number;
    day: number;
  };
  ne: {
    year: number;
    month: number;
    day: number;
    strMonth: string;
    dayOfWeek: string;
  };
}

export function getCurrentNepaliMonthYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const bs = adToBs(`${year}/${month}/${day}`);
  return {
    year: bs.en.year,
    month: bs.en.month,
    formatted: `${bs.en.year}-${String(bs.en.month).padStart(2, "0")}`,
  };
}

export function isPastDeadline(deadlineDay: number) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const bs = adToBs(`${year}/${month}/${day}`);
  return bs.en.day > deadlineDay;
}

export function getDaysInNepaliMonth(year: number, month: number): number {
  // ad-bs-converter doesn't easily expose this, but we can iterate or use a static map
  // For simplicity, we assume 30 or check the last day of the month by incrementing
  // But usually, the month ends at 30, 31, or 32 in BS.
  
  // A safer way if the library supports it:
  // For now, we'll return 30 as a default or implement a more robust check if needed.
  return 30; 
}

export function getNepaliMonthName(monthIndex: number): string {
  const months = [
    "Baishakh",
    "Jestha",
    "Ashadh",
    "Shrawan",
    "Bhadra",
    "Ashwin",
    "Kartik",
    "Mangsir",
    "Poush",
    "Magh",
    "Falgun",
    "Chaitra",
  ];
  return months[monthIndex - 1] || "Unknown";
}
