import type React from "react";
import { Calendar } from "lucide-react";
import { Input } from "./input";

interface DateInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function DateInput({ value, defaultValue, onChange, className = "" }: DateInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Input
        type="date"
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        className="h-9 w-full cursor-pointer bg-muted/50 px-3 pr-10 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
    </div>
  );
}
