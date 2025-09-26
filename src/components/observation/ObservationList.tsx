"use client";

import { useState } from 'react';
import { ObservationCard } from './ObservationCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ObservationListProps {
  entries: any[]; // From API
  onPin: (id: number) => void;
  currentAuthor: string;
  selectedDomain?: string;
  sortBy?: 'date' | 'domain' | 'tags' | 'author';
  onDayFocus?: (date: string) => void;
}

export function ObservationList({ entries, onPin, currentAuthor, selectedDomain, sortBy = 'date', onDayFocus }: ObservationListProps) {
  const [localSort, setLocalSort] = useState(sortBy);

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const dateKey = format(parseISO(entry.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort groups by date descending
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  // Sort entries within group
  Object.keys(groupedEntries).forEach(dateKey => {
    groupedEntries[dateKey].sort((a: any, b: any) => {
      if (localSort === 'time') {
        return (a.time || '00:00').localeCompare(b.time || '00:00');
      }
      // Default to time descending
      return (b.time || '00:00').localeCompare(a.time || '00:00');
    });
  });

  const isAuthor = (entry: any) => entry.author === currentAuthor;

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>선택한 조건에 맞는 관찰 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Badge variant="outline" className="text-sm">
          총 {entries.length}건
        </Badge>
        <Select value={localSort} onValueChange={setLocalSort}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">최신순</SelectItem>
            <SelectItem value="domain">영역순</SelectItem>
            <SelectItem value="tags">키워드순</SelectItem>
            <SelectItem value="author">작성자순</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <ScrollArea className="h-[600px] rounded-md border">
        <div className="p-4 space-y-6">
          {sortedDates.map((dateKey) => {
            const dateEntries = groupedEntries[dateKey];
            const dateObj = parseISO(dateKey);
            const dateLabel = format(dateObj, 'M월 d일 (eee)', { locale: ko });

            return (
              <section key={dateKey} className="space-y-3">
                <div className="flex items-center justify-between sticky top-0 bg-background py-2 border-b">
                  <h3 className="text-lg font-semibold" onClick={() => onDayFocus?.(dateKey)}>
                    {dateLabel} ({dateEntries.length}건)
                  </h3>
                  {onDayFocus && (
                    <Button variant="ghost" size="sm" onClick={() => onDayFocus(dateKey)}>
                      히트맵으로
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {dateEntries.map((entry: any) => (
                    <ObservationCard
                      key={entry.id}
                      entry={entry}
                      onPin={onPin}
                      isAuthor={isAuthor(entry)}
                      currentAuthor={currentAuthor}
                      selectedDomain={selectedDomain}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}