"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";
import { parseDMY } from "@/components/widgets/date-picker";

export interface Time12HourPickerProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"] as const;

export function parse12HourTime(
  timeStr: string
): { hour12: number; minute: number; period: "AM" | "PM" } | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    const h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const p = match12[3].toUpperCase() as "AM" | "PM";
    if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
      return { hour12: h, minute: m, period: p };
    }
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h24 = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h24 >= 0 && h24 <= 23 && m >= 0 && m <= 59) {
      const period = h24 >= 12 ? "PM" : "AM";
      let hour12 = h24 % 12;
      if (hour12 === 0) hour12 = 12;
      return { hour12, minute: m, period };
    }
  }

  return null;
}

export function format12HourTime(
  hour12: number,
  minute: number,
  period: "AM" | "PM"
): string {
  const hStr = String(hour12).padStart(2, "0");
  const mStr = String(minute).padStart(2, "0");
  return `${hStr}:${mStr} ${period}`;
}

export function combineDateAndTime(dateStr: string, timeStr: string): string {
  if (!dateStr) return "";
  const parsedTime = parse12HourTime(timeStr);
  if (!parsedTime) return "";

  // Parse DD-MM-YYYY or YYYY-MM-DD
  const dateObj = parseDMY(dateStr);
  if (!dateObj) return "";

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");

  let { hour12 } = parsedTime;
  const { minute, period } = parsedTime;

  if (period === "PM" && hour12 < 12) hour12 += 12;
  if (period === "AM" && hour12 === 12) hour12 = 0;

  const hh = String(hour12).padStart(2, "0");
  const minStr = String(minute).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${minStr}`;
}

export function Time12HourPicker({
  label = "Time",
  required = false,
  value,
  onChange,
  placeholder = "07:30 PM"
}: Time12HourPickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const parsed = useMemo(() => {
    return parse12HourTime(inputValue || value) || { hour12: 7, minute: 30, period: "PM" as const };
  }, [inputValue, value]);

  const currentHour = parsed.hour12;
  const currentMinute = parsed.minute;
  const currentPeriod = parsed.period;

  function updateTime(h: number, m: number, p: "AM" | "PM") {
    const formatted = format12HourTime(h, m, p);
    setInputValue(formatted);
    onChange(formatted);
  }

  function handleInputChange(text: string) {
    setInputValue(text);
    const parsedText = parse12HourTime(text);
    if (parsedText) {
      const formatted = format12HourTime(
        parsedText.hour12,
        parsedText.minute,
        parsedText.period
      );
      onChange(formatted);
    }
  }

  function handleInputBlur() {
    const parsedText = parse12HourTime(inputValue);
    if (parsedText) {
      const formatted = format12HourTime(
        parsedText.hour12,
        parsedText.minute,
        parsedText.period
      );
      setInputValue(formatted);
      onChange(formatted);
    } else if (value) {
      setInputValue(value);
    }
  }

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
          <div className="relative flex cursor-pointer items-center">
            <Input
              type="text"
              value={inputValue}
              placeholder={placeholder}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
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
              aria-label="Open time picker"
              className="absolute right-2.5 text-muted-foreground hover:text-foreground"
            >
              <Clock className="h-4 w-4" />
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
          className="w-auto p-3"
        >
          <div className="flex gap-2">
            {/* Hours Column */}
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hour
              </span>
              <div className="h-44 w-12 space-y-1 overflow-y-auto overscroll-contain rounded border border-border/70 p-1">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateTime(h, currentMinute, currentPeriod);
                    }}
                    className={cn(
                      "w-full rounded py-1 text-center text-xs font-medium transition-colors",
                      currentHour === h
                        ? "bg-primary font-semibold text-white"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Min
              </span>
              <div className="h-44 w-12 space-y-1 overflow-y-auto overscroll-contain rounded border border-border/70 p-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateTime(currentHour, m, currentPeriod);
                    }}
                    className={cn(
                      "w-full rounded py-1 text-center text-xs font-medium transition-colors",
                      currentMinute === m
                        ? "bg-primary font-semibold text-white"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* AM / PM Column */}
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Period
              </span>
              <div className="h-44 w-14 space-y-1 overflow-y-auto overscroll-contain rounded border border-border/70 p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateTime(currentHour, currentMinute, p);
                    }}
                    className={cn(
                      "w-full rounded py-1.5 text-center text-xs font-medium transition-colors",
                      currentPeriod === p
                        ? "bg-primary font-semibold text-white"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </label>
  );
}
