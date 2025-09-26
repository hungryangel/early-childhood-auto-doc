"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addMonths, subMonths, getYear, getMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const date = value ? new Date(`${value}-01`) : new Date();
  const [currentDate, setCurrentDate] = useState(date);

  const handlePrev = () => {
    const prevMonth = subMonths(currentDate, 1);
    setCurrentDate(prevMonth);
    onChange(format(prevMonth, 'yyyy-MM'));
  };

  const handleNext = () => {
    const nextMonth = addMonths(currentDate, 1);
    setCurrentDate(nextMonth);
    onChange(format(nextMonth, 'yyyy-MM'));
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(year, getMonth(currentDate), 1);
    setCurrentDate(newDate);
    onChange(format(newDate, 'yyyy-MM'));
  };

  const handleMonthChange = (month: number) => {
    const newDate = new Date(getYear(currentDate), month - 1, 1);
    setCurrentDate(newDate);
    onChange(format(newDate, 'yyyy-MM'));
  };

  const years = Array.from({ length: 10 }, (_, i) => getYear(new Date()) + i - 5);
  const months = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Button variant="outline" size="sm" onClick={handlePrev}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      <div className="flex items-center gap-1">
        <Select value={getYear(currentDate).toString()} onValueChange={(val) => handleYearChange(parseInt(val))}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={(getMonth(currentDate) + 1).toString()} onValueChange={(val) => handleMonthChange(parseInt(val))}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button variant="outline" size="sm" onClick={handleNext}>
        <ChevronRight className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="sm" className="text-xs">
        <Calendar className="w-4 h-4 mr-1" />
        달력으로
      </Button>
    </div>
  );
}