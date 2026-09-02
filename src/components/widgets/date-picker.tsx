"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";

export interface DatePickerProps {
  label?: string;
  required?: boolean;
  value: string; // DD-MM-YYYY format
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function formatDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function parseDMY(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  // DD-MM-YYYY or DD/MM/YYYY
  const matchDMY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchDMY) {
    const d = parseInt(matchDMY[1], 10);
    const m = parseInt(matchDMY[2], 10) - 1;
    const y = parseInt(matchDMY[3], 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const date = new Date(y, m, d);
      if (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === y &&
        date.getMonth() === m &&
        date.getDate() === d
      ) {
        return date;
      }
    }
  }

  // Fallback for YYYY-MM-DD
  const matchYMD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchYMD) {
    const y = parseInt(matchYMD[1], 10);
    const m = parseInt(matchYMD[2], 10) - 1;
    const d = parseInt(matchYMD[3], 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const date = new Date(y, m, d);
      if (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === y &&
        date.getMonth() === m &&
        date.getDate() === d
      ) {
        return date;
      }
    }
  }

  return null;
}

export function DatePicker({
  label = "Start Date",
  required = false,
  value,
  onChange,
  placeholder = "31-08-2026"
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => {
    const parsed = parseDMY(value);
    return parsed ? formatDMY(parsed) : value || "";
  });

  const selectedDate = useMemo(() => parseDMY(value), [value]);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date());

  useEffect(() => {
    if (value) {
      const parsed = parseDMY(value);
      if (parsed) {
        setInputValue(formatDMY(parsed));
        setViewDate(parsed);
      } else {
        setInputValue(value);
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  function handleManualTyping(text: string) {
    setInputValue(text);
    const parsed = parseDMY(text);
    if (parsed) {
      const dmy = formatDMY(parsed);
      onChange(dmy);
      setViewDate(parsed);
    }
  }

  function handleBlur() {
    const parsed = parseDMY(inputValue);
    if (parsed) {
      const dmy = formatDMY(parsed);
      setInputValue(dmy);
      onChange(dmy);
      setViewDate(parsed);
    } else if (value) {
      const parsedVal = parseDMY(value);
      setInputValue(parsedVal ? formatDMY(parsedVal) : value);
    } else {
      setInputValue("");
    }
  }

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];

    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDay = prevMonthDays - i;
      const prevDate = new Date(currentYear, currentMonth - 1, prevDay);
      days.push({
        day: prevDay,
        dateStr: formatDMY(prevDate),
        isCurrentMonth: false
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const thisDate = new Date(currentYear, currentMonth, d);
      days.push({
        day: d,
        dateStr: formatDMY(thisDate),
        isCurrentMonth: true
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      days.push({
        day: i,
        dateStr: formatDMY(nextDate),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  function prevMonth(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  }

  function nextMonth(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  }

  function handleSelectDate(dateStr: string) {
    onChange(dateStr);
    setInputValue(dateStr);
    const parsed = parseDMY(dateStr);
    if (parsed) {
      setViewDate(parsed);
    }
    setOpen(false);
  }

  const todayStr = formatDMY(new Date());

  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-[14px] font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </span>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex items-center">
            <Input
              type="text"
              value={inputValue}
              placeholder={placeholder}
              onChange={(e) => handleManualTyping(e.target.value)}
              onBlur={handleBlur}
              className="pr-9"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((prev) => !prev);
              }}
              aria-label="Open calendar"
              className="absolute right-2.5 text-muted-foreground hover:text-foreground"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-[290px] p-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-[14px] font-semibold text-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 pb-1 pt-3 text-center text-[12px] font-medium text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map(({ day, dateStr, isCurrentMonth }, idx) => {
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={`${dateStr}-${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectDate(dateStr);
                  }}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-[13px] font-medium transition-colors",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isCurrentMonth && !isSelected && "text-foreground hover:bg-muted",
                    isToday && !isSelected && "border border-primary font-semibold text-primary",
                    isSelected && "bg-primary font-semibold text-white shadow-sm"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </label>
  );
}
