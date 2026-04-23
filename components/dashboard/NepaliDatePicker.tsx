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
import { 
  adToBs, 
  bsToAd, 
  NEPALI_MONTHS, 
  NEPALI_WEEKDAYS,
  getDaysInMonth,
  getStartDayOfMonth,
  getCurrentNepaliDate
} from "@/lib/utils/nepali-date";

interface NepaliDatePickerProps {
  value: string; // ISO Date String
  onChange: (date: string) => void;
  label?: string;
  disableFuture?: boolean;
}

export default function NepaliDatePicker({ value, onChange, label, disableFuture }: NepaliDatePickerProps) {
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

  const isFutureDate = (day: number) => {
    const adDate = bsToAd(viewDate.year, viewDate.month, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow today
    return adDate > today;
  };

  const handleSelectDay = (day: number) => {
    if (disableFuture && isFutureDate(day)) return;
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
    <div className="space-y-2 relative" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>}
      
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl ring-1 ring-white/5 hover:border-emerald-500/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className={`text-[11px] font-black uppercase tracking-widest ${selectedDate.year ? 'text-white' : 'text-slate-600'}`}>
            {formattedValue}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-700 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 w-[260px] bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl ring-1 ring-white/5"
        >

          {/* Header */}
          <div className="p-3 flex items-center justify-between border-b border-white/5 bg-slate-950/50">
            <button 
              type="button"
              onClick={handlePrevMonth} 
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{NEPALI_MONTHS[viewDate.month - 1]}</p>
              <p className="text-sm font-black text-white">{viewDate.year}</p>
            </div>
            <button 
              type="button"
              onClick={handleNextMonth} 
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 p-3 pb-0">
            {NEPALI_WEEKDAYS.map(wd => (
              <div key={wd} className="text-center text-[7px] font-black text-slate-600 uppercase tracking-widest py-1">
                {wd.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 p-3 pt-1">
            {days.map((day, idx) => {
              const isSelected = day === selectedDate.day && viewDate.month === selectedDate.month && viewDate.year === selectedDate.year;
              const isToday = day === getCurrentNepaliDate().day && viewDate.month === getCurrentNepaliDate().month && viewDate.year === getCurrentNepaliDate().year;
              const disabled = day ? (disableFuture && isFutureDate(day)) : false;
              
              return (
                <div key={idx} className="aspect-square flex items-center justify-center">
                  {day ? (
                    <button
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      disabled={disabled}
                      className={`
                        w-full h-full rounded-lg text-[10px] font-black transition-all relative
                        ${isSelected ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                        ${isToday && !isSelected ? 'ring-1 ring-emerald-500/30' : ''}
                        ${disabled ? 'opacity-10 cursor-not-allowed grayscale' : ''}
                      `}
                    >
                      {day}
                      {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-emerald-500 rounded-full" />}
                    </button>
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Year/Month jump */}
          <div className="p-2 bg-slate-950/30 border-t border-white/5 flex justify-center">
             <button 
               onClick={() => {
                 const current = getCurrentNepaliDate();
                 setViewDate({ year: current.year, month: current.month });
               }}
               className="text-[8px] font-black text-slate-600 hover:text-emerald-400 uppercase tracking-widest"
             >
               Go to Today
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
