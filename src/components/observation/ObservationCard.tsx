"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Image, Pin, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ObservationMedia } from '@/types/observation';

interface ObservationCardProps {
  entry: any; // From API
  onPin: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  isAuthor: boolean;
  currentAuthor: string;
  selectedDomain?: string;
}

export function ObservationCard({ entry, onPin, onEdit, onDelete, isAuthor, currentAuthor, selectedDomain }: ObservationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const domain = entry.domain;
  const tags = Array.isArray(entry.tags) ? entry.tags : JSON.parse(entry.tags || '[]');
  const media = Array.isArray(entry.media) ? entry.media : JSON.parse(entry.media || '[]');
  const followUps = Array.isArray(entry.followUps) ? entry.followUps : JSON.parse(entry.followUps || '[]');

  const handlePin = () => {
    onPin(entry.id);
  };

  const handleEdit = () => onEdit?.(entry.id);
  const handleDelete = () => onDelete?.(entry.id);

  const imageStyle = isAuthor ? 'cursor-pointer' : 'blur-sm';
  const blurClass = !isAuthor ? 'blur-sm' : '';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border-l-4 ${selectedDomain === domain ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">{entry.date} {entry.time}</CardTitle>
                <Badge variant="outline" className="text-xs">{domain}</Badge>
              </div>
              <CardDescription className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {tags.length > 3 && <Badge variant="secondary" className="text-xs">+{tags.length - 3}</Badge>}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {entry.linkedToReport && (
                <Badge variant="default" className="text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  평가서 연결
                </Badge>
              )}
              {isAuthor && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start px-0">
            <CardContent className="p-0 space-y-2 text-sm">
              <p className="font-medium">{entry.summary}</p>
              {isOpen && entry.detail && (
                <p className="text-muted-foreground">{entry.detail}</p>
              )}
              {isOpen && media.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {media.map((m: ObservationMedia, i: number) => (
                    <div key={i} className="relative">
                      {m.type === 'image' ? (
                        <img
                          src={m.url}
                          alt={m.alt}
                          className={`w-full h-24 object-cover rounded ${blurClass}`}
                          onClick={() => setShowFullImage(true)}
                          style={{ filter: imageStyle }}
                        />
                      ) : (
                        <video src={m.url} className={`w-full h-24 object-cover rounded ${blurClass}`} controls />
                      )}
                      {m.alt && <span className="block text-xs text-muted-foreground mt-1">{m.alt}</span>}
                    </div>
                  ))}
                </div>
              )}
              {isOpen && followUps.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>연계지도:</span>
                  {followUps.map((fu: string, i: number) => (
                    <span key={i} className="bg-accent px-2 py-1 rounded-full">{fu}</span>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {entry.author} | 첨부 {media.length}개
              </div>
            </CardContent>
            <div className="sr-only">상세 보기</div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <CardContent className="p-0">
            {entry.detail && (
              <p className="text-sm leading-relaxed">{entry.detail}</p>
            )}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {media.map((m: ObservationMedia, i: number) => (
                  <div key={i} className="relative">
                    {m.type === 'image' ? (
                      <img
                        src={m.url}
                        alt={m.alt}
                        className={`w-full aspect-square object-cover rounded ${blurClass}`}
                        onClick={() => !isAuthor && setShowFullImage(true)}
                        style={{ filter: imageStyle }}
                      />
                    ) : (
                      <video src={m.url} className={`w-full aspect-square object-cover rounded ${blurClass}`} controls />
                    )}
                  </div>
                ))}
              </div>
            )}
            {followUps.length > 0 && (
              <div className="mt-2 p-2 bg-muted/50 rounded">
                <h4 className="font-medium mb-1">연계지도</h4>
                <ul className="text-sm space-y-1">
                  {followUps.map((fu: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {fu}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handlePin} className="flex-1">
                <Pin className="w-3 h-3 mr-1" />
                평가서 글감 담기
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">복사</Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
      {showFullImage && media.some(m => m.type === 'image') && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowFullImage(false)}>
          <img src={media.find(m => m.type === 'image')?.url} alt="상세" className="max-w-full max-h-full" />
        </div>
      )}
    </Collapsible>
  );
}