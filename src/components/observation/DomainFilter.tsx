"use client";

import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DOMAINS = ['전반', '신체', '의사소통', '사회', '예술', '자연'] as const;

interface Tag {
  value: string;
  label: string;
}

const SAMPLE_TAGS: Tag[] = [
  { value: '친사회성', label: '친사회성' },
  { value: '협력', label: '협력' },
  { value: '표현력', label: '표현력' },
  { value: '집중력', label: '집중력' },
  { value: '창의성', label: '창의성' },
  { value: '호기심', label: '호기심' },
  // Add more from seeds
];

interface DomainFilterProps {
  selectedDomain: string | 'all';
  selectedTags: string[];
  onDomainChange: (domain: string | 'all') => void;
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export function DomainFilter({ selectedDomain, selectedTags, onDomainChange, onTagsChange, className }: DomainFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const filteredTags = SAMPLE_TAGS.filter(tag => 
    tag.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTagToggle = (tagValue: string) => {
    const newTags = selectedTags.includes(tagValue)
      ? selectedTags.filter(t => t !== tagValue)
      : [...selectedTags, tagValue];
    onTagsChange(newTags);
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {/* Domain Filter */}
      <div>
        <label className="text-sm font-medium mb-1 block">영역</label>
        <ToggleGroup 
          type="single" 
          value={selectedDomain === 'all' ? undefined : selectedDomain} 
          onValueChange={(val) => onDomainChange(val || 'all')}
          className="w-full justify-start"
        >
          <ToggleGroupItem value="all" className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground flex-1">
            전체
          </ToggleGroupItem>
          {DOMAINS.map(domain => (
            <ToggleGroupItem 
              key={domain} 
              value={domain}
              className="flex-1 data-[state=on]:bg-blue-500 data-[state=on]:text-white"
            >
              {domain}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Tags Filter */}
      <div>
        <label className="text-sm font-medium mb-1 block">키워드</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedTags.length > 0 
                ? `${selectedTags.length}개 선택됨`
                : '키워드 선택'
              }
              <Search className="w-4 h-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 max-h-[400px]">
            <Command>
              <CommandInput 
                placeholder="키워드 검색..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>키워드가 없습니다.</CommandEmpty>
                <CommandGroup>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.value}
                      onSelect={() => handleTagToggle(tag.value)}
                      className="cursor-pointer"
                    >
                      <Check 
                        className={`mr-2 h-4 w-4 ${selectedTags.includes(tag.value) ? 'opacity-100' : 'opacity-0'}`}
                      />
                      {tag.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 ml-1 p-0"
                  onClick={() => handleTagToggle(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-xs"
              onClick={() => onTagsChange([])}
            >
              모두 지우기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}