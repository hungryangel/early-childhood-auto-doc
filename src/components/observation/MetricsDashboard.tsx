"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer as BarResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ObservationEntry } from '@/types/observation';

interface MetricsProps {
  entries: ObservationEntry[];
  month: string;
  totalGoal: number; // e.g., 20 observations per month
  pinnedCount: number;
}

const DOMAIN_COLORS = {
  '전반': '#0ea5e9',
  '신체': '#10b981',
  '의사소통': '#3b82f6',
  '사회': '#8b5cf6',
  '예술': '#f43f5e',
  '자연': '#059669',
};

export function MetricsDashboard({ entries, month, totalGoal, pinnedCount }: MetricsProps) {
  const totalCount = entries.length;
  const weeklyAvg = Math.round((totalCount / 4.3) * 10) / 10; // Approx weeks in month

  // Domain distribution
  const domainCounts = entries.reduce((acc, entry) => {
    acc[entry.domain] = (acc[entry.domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const domainData = Object.entries(domainCounts).map(([domain, count]) => ({
    name: domain,
    value: count,
    fill: DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS],
  }));

  // Top tags
  const tagCounts = entries.reduce((acc, entry) => {
    entry.tags.forEach((tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topTags = Object.entries(tagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  // Consecutive no-observation days
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastObservationDate = sortedEntries[0]?.date ? new Date(sortedEntries[0].date) : new Date();
  const today = new Date();
  const daysSinceLast = Math.floor((today.getTime() - lastObservationDate.getTime()) / (1000 * 60 * 60 * 24));
  const consecutiveNoObs = daysSinceLast > 0 ? daysSinceLast : 0;

  // Readiness score (observations + pinned / goal)
  const readinessScore = Math.min(100, Math.round(((totalCount + pinnedCount) / totalGoal) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Total Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">월간 총 관찰</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalCount}건</div>
          <p className="text-sm text-muted-foreground">주 평균 {weeklyAvg}건</p>
        </CardContent>
      </Card>

      {/* Readiness Gauge */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">평가서 준비도</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={readinessScore} className="w-full" />
          <div className="flex justify-between text-sm mt-2">
            <span>{readinessScore}%</span>
            <span className="text-muted-foreground">목표: {totalGoal}건</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            관찰 {totalCount} + 글감 {pinnedCount}
          </p>
        </CardContent>
      </Card>

      {/* Consecutive No-Obs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">관찰 빈도</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-destructive">{consecutiveNoObs}일</div>
          <p className="text-sm text-muted-foreground">연속 관찰 없음</p>
          {consecutiveNoObs === 0 && (
            <Badge className="mt-2" variant="default">최근 관찰 완료</Badge>
          )}
        </CardContent>
      </Card>

      {/* Domain Distribution Donut */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">영역 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={domainData.length > 0 ? domainData : [{ name: '전체', value: 1, fill: '#e5e7eb' }]}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                paddingAngle={5}
              >
                {domainData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value) => [`${value}건`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center text-sm">
            {domainData.map((d, i) => (
              <div key={i} className="flex items-center justify-center gap-2 mt-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: d.fill }} />
                {d.name}: {d.value}건
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Tags */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">상위 키워드 TOP5</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={topTags} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="tag" type="category" tick={{ fontSize: 12 }} width={100} />
              <Bar dataKey="count" fill="#3b82f6" barSize={20} />
              <RechartsTooltip />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-2 mt-2 text-center text-xs">
            {topTags.map((item, i) => (
              <Badge key={i} variant="secondary" className="py-1">
                #{item.tag}<br />
                <span className="text-primary font-medium">{item.count}</span>
              </Badge>
            ))}
            {topTags.length < 5 && (
              <div className="col-span-5 text-center text-sm text-muted-foreground">
                추가 키워드가 부족합니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}