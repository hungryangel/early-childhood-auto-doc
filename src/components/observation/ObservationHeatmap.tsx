"use client";

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface ObservationHeatmapProps {
  month: string; // YYYY-MM
  dailyCounts: Record<string, number>;
  selectedDomain?: string;
  onDayClick: (date: string) => void;
  tagsByDate?: Record<string, string[]>;
}

const DOMAIN_COLORS = {
  '전반': 'bg-teal',
  '신체': 'bg-green',
  '의사소통': 'bg-blue',
  '사회': 'bg-violet',
  '예술': 'bg-rose',
  '자연': 'bg-emerald',
} as const;

const INTENSITY_COLORS = ['bg-muted', 'bg-primary/20', 'bg-primary/40', 'bg-primary/60', 'bg-primary'] as const;

export function ObservationHeatmap({ month, dailyCounts, selectedDomain, onDayClick, tagsByDate }: ObservationHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const date = new Date(month + '-01');
  const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });

  const getDayColor = (dayDate: Date, observationCount: number, domainEntries?: string[]) => {
    if (observationCount === 0) return 'bg-muted';
    
    let baseColor = 'bg-primary';
    if (selectedDomain && selectedDomain !== '전반') {
      baseColor = DOMAIN_COLORS[selectedDomain as keyof typeof DOMAIN_COLORS] || 'bg-primary';
    } else if (domainEntries && domainEntries.length > 0) {
      const primaryDomain = domainEntries[0]?.split('-')[0] as keyof typeof DOMAIN_COLORS;
      baseColor = DOMAIN_COLORS[primaryDomain] || 'bg-primary';
    }

    const intensityIndex = Math.min(observationCount, INTENSITY_COLORS.length - 1);
    return `${baseColor}/${intensityIndex * 20}`;
  };

  const getTooltipContent = (dayDate: Date, observationCount: number) => {
    if (observationCount === 0) return null;
    
    const dateStr = format(dayDate, 'M/d (eee)', { locale: ko });
    const tags = tagsByDate ? tagsByDate[format(dayDate, 'yyyy-MM-dd')] || [] : [];
    const topTags = tags.slice(0, 3).join(' ');
    
    const tooltipText = topTags ? ` #${topTags}` : '';
    return `${dateStr} · ${observationCount}건 ${tooltipText}`;
  };

  const daysWithData = days.map((dayDate) => {
    const dateStr = format(dayDate, 'yyyy-MM-dd');
    const observationCount = dailyCounts[dateStr] || 0;
    const isCurrentMonth = isSameMonth(dayDate, date);
    const domainEntries = tagsByDate?.[dateStr] || [];
    const dayColor = getDayColor(dayDate, observationCount, domainEntries);
    const tooltipContent = getTooltipContent(dayDate, observationCount);

    return { 
      dayDate, 
      dateStr, 
      observationCount,
      isCurrentMonth, 
      dayColor, 
      tooltipContent
    };
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <div>
          <span className="font-medium">{format(date, 'yyyy년 MM월', { locale: ko })}</span>
        </div>
        <div className="flex gap-1 text-xs">
          <Badge variant="outline" className="px-1 py-0.5">Less</Badge>
          {INTENSITY_COLORS.slice(1).map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded ${color}`} />
          ))}
          <Badge variant="outline" className="px-1 py-0.5">More</Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {/* Weekday headers */}
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
        
        {/* Days */}
        {daysWithData.map(({ dayDate, dateStr, observationCount, isCurrentMonth, dayColor, tooltipContent }) => (
          <TooltipProvider key={dateStr}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 rounded ${!isCurrentMonth ? 'opacity-50' : ''} ${observationCount === 0 ? 'cursor-default' : 'hover:bg-accent'}`}
                  onClick={() => observationCount > 0 && onDayClick(dateStr)}
                  aria-label={`${format(dayDate, 'M월 d일')}에 ${observationCount}건 관찰`}
                  tabIndex={observationCount > 0 ? 0 : -1}
                >
                  <span className={`${dayColor} w-2 h-2 rounded-full block mx-auto ${observationCount === 0 ? 'bg-muted' : ''}`}>
                    {observationCount > 0 && observationCount >= 5 ? <span className="text-xs text-primary-foreground">{observationCount}</span> : null}
                  </span>
                </Button>
              </TooltipTrigger>
              {tooltipContent && <TooltipContent>{tooltipContent}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {/* Fill grid with empty cells if needed */}
        {Array.from({ length: (7 - days.length % 7) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
      </div>
    </div>
  );
}