"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChildSwitcher } from '@/components/observation/ChildSwitcher';
import { MonthPicker } from '@/components/observation/MonthPicker';
import { DomainFilter } from '@/components/observation/DomainFilter';
import { ObservationHeatmap } from '@/components/observation/ObservationHeatmap';
import { ObservationList } from '@/components/observation/ObservationList';
import { MetricsDashboard } from '@/components/observation/MetricsDashboard';
import { ReportBasket } from '@/components/observation/ReportBasket';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { ObservationEntry, ApiResponse } from '@/types/observation';

interface ObservationPageClientProps {
  childId: number;
}

export function ObservationPageClient({ childId }: ObservationPageClientProps) {
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('2025-09');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [pinnedItems, setPinnedItems] = useState<number[]>([]);
  const [currentAuthor] = useState('이슬반_김교사');
  const [childInfo, setChildInfo] = useState<any>(null);

  useEffect(() => {
    if (!childId) return;
    fetchChildInfo();
    fetchObservations();
  }, [childId]);

  useEffect(() => {
    fetchObservations();
  }, [month, selectedDomain, selectedTags, searchTerm]);

  const fetchChildInfo = async () => {
    try {
      const res = await fetch(`/api/children/${childId}`);
      if (res.ok) {
        const child = await res.json();
        setChildInfo(child);
      }
    } catch (err) {
      console.error('Failed to fetch child info');
    }
  };

  const fetchObservations = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/api/observations?childId=${childId}&month=${month}`;
      if (selectedDomain !== 'all') url += `&domain=${selectedDomain}`;
      if (selectedTags.length > 0) url += `&tags=${selectedTags.join(',')}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch observations');
      }
      const result: ApiResponse = await response.json();
      setData(result);
    } catch (err) {
      setError('관찰 데이터를 불러올 수 없습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (date: string) => {
    setSelectedDay(date);
  };

  const handlePin = (id: number) => {
    const isPinned = pinnedItems.includes(id);
    if (isPinned) {
      setPinnedItems(prev => prev.filter(p => p !== id));
    } else {
      setPinnedItems(prev => [...prev, id]);
    }
    localStorage.setItem('pinnedObservations', JSON.stringify(pinnedItems));
  };

  const filteredEntries = data?.entries || [];
  const dayEntries = selectedDay ? filteredEntries.filter(e => e.date === selectedDay) : [];

  const handleExportPDF = async () => {
    const element = document.getElementById('observation-content');
    if (element) {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`관찰일지_${month}_${childInfo?.name || '아동'}.pdf`);
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredEntries.map(entry => ({
      날짜: entry.date,
      시간: entry.time,
      영역: entry.domain,
      키워드: Array.isArray(entry.tags) ? entry.tags.join(', ') : '',
      요약: entry.summary,
      상세: entry.detail || '',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `관찰일지_${month}_${childInfo?.name || '아동'}.csv`);
    link.click();
  };

  if (loading) {
    return <div className="container mx-auto p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4"><p className="text-red-600">{error}</p></div>;
  }

  const emptyState = !data || data.totalCount === 0;

  const computeTagsByDate = (entries: ObservationEntry[]) => {
    return entries.reduce((acc, entry) => {
      if (entry.date) {
        acc[entry.date] = acc[entry.date] || [];
        acc[entry.date].push(...(Array.isArray(entry.tags) ? entry.tags.slice(0, 3) : []));
      }
      return acc;
    }, {} as Record<string, string[]>);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <ChildSwitcher currentChildId={childId} />
          <MonthPicker value={month} onChange={setMonth} />
          <DomainFilter
            selectedDomain={selectedDomain}
            selectedTags={selectedTags}
            onDomainChange={setSelectedDomain}
            onTagsChange={setSelectedTags}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="키워드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          <ReportBasket onPin={handlePin} />
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </div>

      {childInfo && (
        <h1 className="text-2xl font-bold mb-4">{childInfo.name}의 관찰일지</h1>
      )}

      {!emptyState && (
        <MetricsDashboard
          entries={filteredEntries}
          month={month}
          totalGoal={20}
          pinnedCount={pinnedItems.length}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3">
          <div className="sticky top-4">
            <ObservationHeatmap
              month={month}
              dailyCounts={data?.dailyCounts || {}}
              selectedDomain={selectedDomain}
              onDayClick={handleDayClick}
              tagsByDate={computeTagsByDate(filteredEntries)}
            />
          </div>
        </div>

        <div className="lg:w-2/3">
          {emptyState ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-4">이번 달 관찰이 아직 없어요.</p>
              <Button onClick={() => router.push('/observation-log/new')}>
                +버튼으로 바로 기록
              </Button>
            </div>
          ) : (
            <ObservationList
              entries={filteredEntries}
              onPin={handlePin}
              currentAuthor={currentAuthor}
              selectedDomain={selectedDomain}
              onDayFocus={setSelectedDay}
            />
          )}
        </div>
      </div>

      <Drawer open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DrawerContent>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              {selectedDay} 상세 관찰 ({dayEntries.length}건)
            </h2>
            <ObservationList
              entries={dayEntries}
              onPin={handlePin}
              currentAuthor={currentAuthor}
              selectedDomain={selectedDomain}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <div id="observation-content" className="hidden print:block">
        <h2>관찰일지 {month}</h2>
        <ObservationList
          entries={filteredEntries}
          onPin={() => {}}
          currentAuthor={currentAuthor}
          selectedDomain={selectedDomain}
        />
      </div>
    </div>
  );
}