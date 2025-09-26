'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ActivityPlanPage() {
  const [theme, setTheme] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ageGroup, setAgeGroup] = useState('0-2');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [classInfo, setClassInfo] = useState(null);

  useEffect(() => {
    fetchClassInfo();
  }, []);

  const fetchClassInfo = async () => {
    try {
      const res = await fetch('/api/classes');
      if (res.ok) {
        const classes = await res.json();
        if (classes.length > 0) {
          const cls = classes[0];
          setClassInfo(cls);
          const ageNum = parseInt(cls.age.match(/\d+/)?.[0] || '0');
          const group = ageNum <= 2 ? '0-2' : '3-5';
          setAgeGroup(group);
        }
      }
    } catch (error) {
      console.error('Failed to fetch class info:', error);
    }
  };

  const handleGenerate = async () => {
    if (!theme || !startDate || !endDate || !ageGroup) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      toast.error('끝 날짜가 시작 날짜보다 이전입니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-activity-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, startDate, endDate, ageGroup }),
      });

      const data = await res.json();
      if (data.success) {
        setPlan(data.plan);
        toast.success('활동계획이 생성되었습니다.');
      } else {
        toast.error(data.error || '생성에 실패했습니다.');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">활동계획</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>활동계획 생성</CardTitle>
          <CardDescription>월간 주제, 기간, 연령을 입력하고 AI로 활동계획을 생성하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme">월간 주제</Label>
            <Input id="theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="예: 봄" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">시작 날짜</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">끝 날짜</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            AI 생성
          </Button>
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>생성된 활동계획</CardTitle>
          </CardHeader>
          <CardContent>
            {plan.map((weekData) => (
              <div key={weekData.week} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">주 {weekData.week}: {weekData.subtheme}</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>활동영역</TableHead>
                      <TableHead>활동명</TableHead>
                      <TableHead>활동내용</TableHead>
                      <TableHead>준비자료</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekData.activities.map((act, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{act.area}</TableCell>
                        <TableCell>{act.activityName}</TableCell>
                        <TableCell>{act.content}</TableCell>
                        <TableCell>{act.materials}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}