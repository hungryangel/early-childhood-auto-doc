"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

interface Child {
  id: number;
  name: string;
  className: string;
  birthdate: string;
}

interface ChildSwitcherProps {
  currentChildId?: number;
  className?: string;
}

export function ChildSwitcher({ currentChildId, className }: ChildSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (currentChildId) {
      const found = children.find(c => c.id === currentChildId);
      setSelectedChild(found || null);
    }
  }, [children, currentChildId]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/children');
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
        if (currentChildId) {
          const found = data.find((c: Child) => c.id === currentChildId);
          setSelectedChild(found || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch children');
    } finally {
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (child: Child) => {
    setSelectedChild(child);
    setOpen(false);
    setSearch('');
    // Navigate to the selected child's observation page
    router.push(`/observation-log/${child.id}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-[200px] justify-between ${className || ''}`}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : selectedChild ? (
            <>
              <Avatar className="mr-2 h-5 w-5">
                <AvatarImage src="" />
                <AvatarFallback className="h-5 w-5 text-xs">
                  {selectedChild.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {selectedChild.name} ({selectedChild.className})
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              아동 선택
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="아동 검색..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>아동을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup className="max-h-48 overflow-y-auto">
              {filteredChildren.map((child) => (
                <CommandItem
                  key={child.id}
                  value={child.name}
                  onSelect={() => handleSelect(child)}
                  className="cursor-pointer"
                >
                  <Avatar className="mr-2 h-6 w-6">
                    <AvatarImage src="" />
                    <AvatarFallback className="h-6 w-6 text-xs">
                      {child.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {child.name}
                    <div className="text-xs text-muted-foreground">
                      {child.className}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}