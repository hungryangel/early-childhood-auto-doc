"use client";

import { useState, useEffect, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Pin, GripVertical } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ObservationEntry } from '@/types/observation';

interface ReportBasketProps {
  onPin: (id: number, action: 'pin' | 'unpin') => void;
}

interface PinnedObservation extends ObservationEntry {
  order: number;
}

export function ReportBasket({ onPin }: ReportBasketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pinnedItems, setPinnedItems] = useState<PinnedObservation[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('reportBasket');
    if (stored) {
      const parsed: PinnedObservation[] = JSON.parse(stored);
      setPinnedItems(parsed);
    }
  }, []);

  const saveToStorage = (items: PinnedObservation[]) => {
    localStorage.setItem('reportBasket', JSON.stringify(items));
    setPinnedItems(items);
  };

  const handlePin = (entry: ObservationEntry, action: 'pin' | 'unpin') => {
    if (action === 'pin') {
      const newItem: PinnedObservation = { ...entry, order: Date.now() };
      const newItems = [...pinnedItems, newItem].sort((a, b) => a.order - b.order);
      saveToStorage(newItems);
    } else {
      const newItems = pinnedItems.filter(item => item.id !== entry.id);
      saveToStorage(newItems);
    }
    onPin(entry.id, action);
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const newItems = [...pinnedItems];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    // Update orders
    newItems.forEach((item, idx) => item.order = idx);
    saveToStorage(newItems);
  };

  const handleGoToReport = () => {
    router.push('/development-evaluation/new');
  };

  const pinnedCount = pinnedItems.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="relative">
          <Pin className="w-4 h-4 mr-1" />
          글감 바구니
          {pinnedCount > 0 && (
            <Badge variant="destructive" className="ml-1 absolute -top-1 -right-1 min-w-[20px] h-[20px] text-xs">
              {pinnedCount}
            </Badge>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 w-80 max-h-96 overflow-y-auto">
        <Card>
          <CardContent className="p-4 space-y-3">
            {pinnedCount === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Pin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>평가서에 담을 관찰을 선택하세요</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">담긴 글감 ({pinnedCount}개)</h3>
                  <Button variant="ghost" size="sm" onClick={handleGoToReport}>
                    평가서 작성
                  </Button>
                </div>
                <div className="space-y-2">
                  {pinnedItems.map((item, index) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, index)}
                      className="flex items-center gap-2 p-2 bg-muted rounded cursor-move"
                    >
                      <GripVertical className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.summary}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.date} {item.domain}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePin(item, 'unpin')}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}