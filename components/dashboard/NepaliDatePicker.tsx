"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  adToBs, 
  bsToAd, 
  NEPALI_MONTHS, 
  NEPALI_WEEKDAYS,
  getDaysInMonth,
  getStartDayOfMonth,
  getCurrentNepaliDate,
  getNepaliYearRange
} from "@/lib/utils/nepali-date";

interface NepaliDatePickerProps {
  value: string; // ISO Date String
  onChange: (date: string) => void;
  label?: string;
  disableFuture?: boolean;
  position?: "top" | "bottom";
  side?: "left" | "right" | "bottom" | "top";
  compact?: boolean;
  maxDate?: string; // ISO Date String
  minDate?: string; // ISO Date String
  startYear?: number;
}

export default function NepaliDatePicker({ 
  value, 
  onChange, 
  label, 
  disableFuture, 
  position = "bottom", 
  side = "bottom", 
  compact = false, 
  maxDate,
  minDate,
  startYear = 2070
}: NepaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState({ year: 2080, month: 1 });
  const [selectedDate, setSelectedDate] = useState({ year: 0, month: 0, day: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const converted = adToBs(new Date(value));
      setSelectedDate({ year: converted.year, month: converted.month, day: converted.day });
      setViewDate({ year: converted.year, month: converted.month });
    } else {
      const current = getCurrentNepaliDate();
      setViewDate({ year: current.year, month: current.month });
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (viewDate.month === 1) {
      setViewDate({ year: viewDate.year - 1, month: 12 });
    } else {
      setViewDate({ month: viewDate.month - 1, year: viewDate.year });
    }
  };

  const handleNextMonth = () => {
    if (viewDate.month === 12) {
      setViewDate({ year: viewDate.year + 1, month: 1 });
    } else {
      setViewDate({ month: viewDate.month + 1, year: viewDate.year });
    }
  };

  const isDateDisabled = (day: number) => {
    const adDate = bsToAd(viewDate.year, viewDate.month, day);
    
    if (maxDate) {
      const maxLimit = new Date(maxDate);
      maxLimit.setHours(23, 59, 59, 999);
      if (adDate > maxLimit) return true;
    }

    if (minDate) {
      const minLimit = new Date(minDate);
      minLimit.setHours(0, 0, 0, 0);
      if (adDate < minLimit) return true;
    }

    if (disableFuture) {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Allow today
      if (adDate > today) return true;
    }

    return false;
  };

  const prevMonthDisabled = (() => {
    if (!minDate) return false;
    try {
      const minBs = adToBs(new Date(minDate));
      if (viewDate.year < minBs.year) return true;
      if (viewDate.year === minBs.year && viewDate.month <= minBs.month) return true;
      return false;
    } catch {
      return false;
    }
  })();

  const nextMonthDisabled = (() => {
    if (!maxDate && disableFuture) {
      const todayBs = getCurrentNepaliDate();
      if (viewDate.year > todayBs.year) return true;
      if (viewDate.year === todayBs.year && viewDate.month >= todayBs.month) return true;
      return false;
    }
    if (maxDate) {
      try {
        const maxBs = adToBs(new Date(maxDate));
        if (viewDate.year > maxBs.year) return true;
        if (viewDate.year === maxBs.year && viewDate.month >= maxBs.month) return true;
        return false;
      } catch {}
    }
    return false;
  })();

  const handleSelectDay = (day: number) => {
    if (isDateDisabled(day)) return;
    const adDate = bsToAd(viewDate.year, viewDate.month, day);
    onChange(adDate.toISOString());
    setIsOpen(false);
  };

  const startDay = getStartDayOfMonth(viewDate.year, viewDate.month);
  const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month);
  
  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const formattedValue = selectedDate.year 
    ? `${NEPALI_MONTHS[selectedDate.month - 1]} ${selectedDate.day.toString().padStart(2, '0')}, ${selectedDate.year}`
    : "Select Nepali Date";

  return (
    <div className="space-y-3 relative" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">{label}</label>}
      
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-4 px-6 py-4 bg-white/[0.03] border rounded-2xl ring-1 ring-white/5 transition-all group ${isOpen ? 'border-emerald-500/50 bg-white/[0.05]' : 'border-white/5 hover:border-emerald-500/30'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl transition-all ${selectedDate.year ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-600 group-hover:text-slate-400'}`}>
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className={`text-xs font-black uppercase tracking-widest ${selectedDate.year ? 'text-white' : 'text-slate-600'}`}>
            {formattedValue}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-700 transition-transform duration-500 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ 
              opacity: 0, 
              y: side === "top" ? -10 : (side === "bottom" ? 10 : 0),
              x: side === "left" ? -10 : (side === "right" ? 10 : 0),
              scale: 0.95 
            }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ 
              opacity: 0, 
              y: side === "top" ? -10 : (side === "bottom" ? 10 : 0),
              x: side === "left" ? -10 : (side === "right" ? 10 : 0),
              scale: 0.95 
            }}
            onClick={(e) => e.stopPropagation()}
            className={`
              absolute z-[300] overflow-hidden backdrop-blur-3xl ring-1 ring-white/5
              ${compact ? 'w-60' : 'w-80'} bg-slate-900/95 border border-white/10 rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.9)]
              ${side === "top" ? "bottom-full left-0 mb-3" : ""}
              ${side === "bottom" ? "top-full left-0 mt-3" : ""}
              ${side === "left" ? "right-full top-0 mr-4" : ""}
              ${side === "right" ? "left-full top-0 ml-4" : ""}
            `}
          >
            {/* Header */}
            <div className={`${compact ? 'p-3' : 'p-6'} flex items-center justify-between border-b border-white/5 bg-white/[0.02]`}>
              <button 
                type="button"
                disabled={prevMonthDisabled}
                onClick={handlePrevMonth} 
                className="p-2 hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-xl text-slate-500 hover:text-white transition-all active:scale-90"
              >
                <ChevronLeft className={`${compact ? 'w-4 h-4' : 'w-6 h-6'}`} />
              </button>
              <div className="text-center group cursor-default">
                <p className={`font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 group-hover:scale-110 transition-transform ${compact ? 'text-[8px]' : 'text-[11px]'}`}>
                  {NEPALI_MONTHS[viewDate.month - 1]}
                </p>
                <select 
                  value={viewDate.year} 
                  onChange={(e) => setViewDate({ ...viewDate, year: Number(e.target.value) })}
                  className="bg-transparent border-none p-0 font-black text-white tracking-tight focus:ring-0 cursor-pointer text-center outline-none hover:text-emerald-400 transition-colors appearance-none"
                  style={{ fontSize: compact ? '14px' : '20px' }}
                >
                  {getNepaliYearRange(startYear).map((y: number) => (
                    <option key={y} value={y} className="bg-slate-900 text-white text-sm">{y}</option>
                  ))}
                </select>
              </div>
              <button 
                type="button"
                disabled={nextMonthDisabled}
                onClick={handleNextMonth} 
                className="p-2 hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-xl text-slate-500 hover:text-white transition-all active:scale-90"
              >
                <ChevronRight className={`${compact ? 'w-4 h-4' : 'w-6 h-6'}`} />
              </button>
            </div>

            {/* Weekdays */}
            <div className={`grid grid-cols-7 gap-1 ${compact ? 'p-3' : 'p-6'} pb-0`}>
              {NEPALI_WEEKDAYS.map(wd => (
                <div key={wd} className={`text-center font-black text-slate-600 uppercase tracking-widest py-2 ${compact ? 'text-[7px]' : 'text-[9px]'}`}>
                  {wd.substring(0, 3)}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className={`grid grid-cols-7 gap-2 ${compact ? 'p-3' : 'p-6'} pt-2`}>
              {days.map((day, idx) => {
                const isSelected = day === selectedDate.day && viewDate.month === selectedDate.month && viewDate.year === selectedDate.year;
                const isToday = day === getCurrentNepaliDate().day && viewDate.month === getCurrentNepaliDate().month && viewDate.year === getCurrentNepaliDate().year;
                const disabled = day ? isDateDisabled(day) : false;
                
                return (
                  <div key={idx} className="aspect-square flex items-center justify-center">
                    {day ? (
                      <button
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        disabled={disabled}
                        className={`
                          w-full h-full rounded-xl font-black transition-all relative group/day
                          ${compact ? 'text-[10px]' : 'text-[13px]'}
                          ${isSelected ? 'bg-emerald-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                          ${isToday && !isSelected ? 'ring-1 ring-emerald-500/30' : ''}
                          ${disabled ? 'opacity-10 cursor-not-allowed grayscale' : ''}
                        `}
                      >
                        {day}
                        {isToday && !isSelected && (
                          <motion.span 
                            layoutId="today-dot"
                            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]" 
                          />
                        )}
                        {!isSelected && !disabled && (
                          <div className="absolute inset-0 bg-emerald-500/0 group-hover/day:bg-emerald-500/5 rounded-xl transition-colors" />
                        )}
                      </button>
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Year/Month jump */}
            <div className="p-3 bg-white/[0.02] border-t border-white/5 flex justify-center">
               <button 
                 type="button"
                 onClick={() => {
                   const current = getCurrentNepaliDate();
                   setViewDate({ year: current.year, month: current.month });
                 }}
                 className="text-[9px] font-black text-slate-500 hover:text-emerald-400 uppercase tracking-widest transition-colors flex items-center gap-2"
               >
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 Return to Today
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
