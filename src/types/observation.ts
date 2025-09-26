export interface ObservationMedia {
  type: 'image' | 'video';
  url: string;
  alt: string;
}

export interface ObservationEntry {
  id: number;
  childId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  domain: '전반' | '신체' | '의사소통' | '사회' | '예술' | '자연';
  tags: string[];
  summary: string;
  detail?: string;
  media: ObservationMedia[];
  author: string;
  followUps: string[];
  linkedToReport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  dailyCounts: Record<string, number>;
  totalCount: number;
  entries: ObservationEntry[];
}

export interface DomainCounts {
  [key: string]: number;
}

export interface TagCounts {
  [tag: string]: number;
}