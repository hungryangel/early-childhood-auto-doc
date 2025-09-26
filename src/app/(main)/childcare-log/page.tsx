"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import html2pdf from 'html2pdf.js'
import { DateRange } from 'react-day-picker'
import { CalendarIcon, ArrowUp, ArrowDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { addDays } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'

interface ScheduleItem {
  time: string
  startTime: string
  endTime: string
  activity: string
  execution: string // o, x, 확장, 축소, 대체
  fixed?: boolean // 일과 고정 여부
}

interface ChildcareLog {
  id: number
  classId: number
  date: string
  keywords: string
  evaluation: string
  supportPlan: string
  schedule: ScheduleItem[] | null
  createdAt: string
}

interface ClassInfo {
  id: number
  age: string
  className: string
}

export default function ChildcareLog() {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activityPlans, setActivityPlans] = useState<any[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [evaluationKeywords, setEvaluationKeywords] = useState('')
  const [evaluationText, setEvaluationText] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [previousPlanSummary, setPreviousPlanSummary] = useState('')
  const [todaySummary, setTodaySummary] = useState('')
  const [logId, setLogId] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 4) // Mon-Fri
  })
  const [pdfLoading, setPdfLoading] = useState(false)
  const [children, setChildren] = useState<any[]>([])
  const [observationRows, setObservationRows] = useState<any[]>([])
  const [obsLoading, setObsLoading] = useState(false)
  const [hasScheduleDates, setHasScheduleDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 초기 1회: 반 정보와 활동계획만 로드
    loadClassInfo()
    loadActivityPlans()
  }, [])

  useEffect(() => {
    // 반 정보가 준비되면 해당 날짜의 일지를 로드 (기본 10행 초기화 포함)
    if (classInfo) {
      loadDailyLog()
    }
  }, [selectedDate, classInfo])

  // 반 정보가 없더라도 화면에 기본 10행이 보이도록 초기화
  useEffect(() => {
    if (!classInfo && schedule.length === 0) {
      initSchedule()
    }
  }, [classInfo])

  useEffect(() => {
    if (classInfo) {
      loadChildren()
      loadObservations()
    }
  }, [classInfo, selectedDate])

  useEffect(() => {
    if (classInfo) {
      loadHasScheduleDates()
    }
  }, [classInfo])

  const loadClassInfo = async () => {
    try {
      setApiLoading(true)
      const response = await fetch('/api/classes')
      if (response.ok) {
        const classes = await response.json()
        if (classes.length > 0) {
          setClassInfo(classes[0])
        }
      }
    } catch (error) {
      console.error('Class info load error:', error)
    } finally {
      setApiLoading(false)
    }
  }

  const loadActivityPlans = async () => {
    try {
      const response = await fetch('/api/activity-plans')
      if (response.ok) {
        const plans = await response.json()
        setActivityPlans(plans)
      }
    } catch (error) {
      console.error('Activity plans load error:', error)
    }
  }

  const determineCurriculum = (ageStr: string): string => {
    const ageNum = parseInt(ageStr?.match(/\d+/)?.[0] || '0')
    return ageNum <= 2 ? '표준보육과정' : '누리과정'
  }

  const loadChildren = async () => {
    try {
      const response = await fetch(`/api/children?classId=${classInfo.id}`)
      if (response.ok) {
        const data = await response.json()
        setChildren(data.children || [])
      }
    } catch (error) {
      console.error('Children load error:', error)
    }
  }

  const loadObservations = async () => {
    if (!classInfo) return
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/daily-observations?date=${dateStr}&classId=${classInfo.id}`)
      if (response.ok) {
        const obsList = await response.json() // direct array
        setObservationRows(obsList.map((o: any) => ({
          id: o.id,
          childId: o.child_id,
          observation: o.observation
        })))
      } else {
        setObservationRows([])
      }
    } catch (error) {
      console.error('Observations load error:', error)
      setObservationRows([])
    }
  }

  const loadHasScheduleDates = async () => {
    if (!classInfo) return
    try {
      const res = await fetch(`/api/childcare-logs?classId=${classInfo.id}&limit=365`)
      if (res.ok) {
        const logs = await res.json()
        const dates = logs
          .filter((l: any) => l.schedule && Array.isArray(l.schedule) && l.schedule.length > 0)
          .map((l: any) => l.date)
          .filter(Boolean)
        setHasScheduleDates(new Set(dates))
      }
    } catch (e) {
      console.error('Load has schedule dates error:', e)
    }
  }

  const loadDailyLog = async () => {
    if (!classInfo) return
    try {
      setApiLoading(true)
      const response = await fetch(`/api/childcare-logs/${format(selectedDate, 'yyyy-MM-dd')}?classId=${classInfo.id}`)
      if (response.ok) {
        const logs: ChildcareLog[] = await response.json()
        if (logs.length > 0) {
          const log = logs[0]
          setEvaluationText(log.evaluation)
          setLogId(log.id)
          setTodaySummary('오늘의 활동 요약을 입력하세요.')

          const hasSchedule = Array.isArray(log.schedule) && log.schedule.length > 0
          if (hasSchedule) {
            setSchedule(log.schedule as ScheduleItem[])
          } else {
            initSchedule()
          }
        } else {
          initSchedule()
        }
      }
    } catch (error) {
      console.error('Daily log load error:', error)
      initSchedule()
    } finally {
      setApiLoading(false)
    }

    // Load previous plan
    const yesterday = new Date(selectedDate)
    yesterday.setDate(yesterday.getDate() - 1)
    try {
      const response = await fetch(`/api/childcare-logs/${format(yesterday, 'yyyy-MM-dd')}?classId=${classInfo?.id || 1}`)
      if (response.ok) {
        const logs = await response.json()
        if (logs.length > 0) {
          setPreviousPlanSummary(logs[0].supportPlan || '이전 계획 없음')
        }
      }
    } catch (error) {
      console.error('Previous log load error:', error)
    }
  }

  const initSchedule = () => {
    const template: ScheduleItem[] = [
      { 
        time: '등원 및 통합보육', 
        startTime: '09:00', 
        endTime: '10:00', 
        activity: '자유 놀이', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '오전간식', 
        startTime: '10:00', 
        endTime: '10:30', 
        activity: '간식', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '오전 실내놀이', 
        startTime: '10:30', 
        endTime: '11:30', 
        activity: loadIndoorActivity(), 
        execution: '', 
        fixed: true 
      },
      { 
        time: '활동', 
        startTime: '11:30', 
        endTime: '12:00', 
        activity: '주요 활동', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '점심식사', 
        startTime: '12:00', 
        endTime: '12:30', 
        activity: '식사', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '낮잠 및 휴식', 
        startTime: '13:00', 
        endTime: '14:00', 
        activity: '휴식', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '바깥놀이(대체)', 
        startTime: '14:00', 
        endTime: '14:30', 
        activity: '야외 활동', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '오후놀이', 
        startTime: '14:30', 
        endTime: '15:30', 
        activity: '자유 놀이', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '오후간식', 
        startTime: '15:30', 
        endTime: '16:00', 
        activity: '간식', 
        execution: '', 
        fixed: true 
      },
      { 
        time: '귀가 및 통합보육', 
        startTime: '16:00', 
        endTime: '17:00', 
        activity: '귀가', 
        execution: '', 
        fixed: true 
      },
    ]

    // Update time display for all
    template.forEach(item => {
      const range = `${item.startTime} ~ ${item.endTime}`
      item.time = `${item.time} (${range})`
    })

    // 고정 템플릿 적용 (로컬 저장소) - override if exists
    try {
      const key = classInfo ? `fixedSchedule_${classInfo.id}` : null
      if (key) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const fixedItems: Array<{ label: string; startTime: string; endTime: string; activity: string }> = JSON.parse(raw)
          fixedItems.forEach(fi => {
            const idx = template.findIndex(t => t.time.startsWith(fi.label))
            if (idx !== -1) {
              template[idx].startTime = fi.startTime
              template[idx].endTime = fi.endTime
              template[idx].activity = fi.activity
              const range = fi.startTime && fi.endTime ? ` (${fi.startTime} ~ ${fi.endTime})` : ''
              template[idx].time = fi.label + range
            }
          })
        }
      }
    } catch (e) {
      // ignore
    }

    setSchedule(template)
    setTodaySummary('오늘의 활동 요약을 입력하세요.')
  }

  const loadIndoorActivity = () => {
    const indoorPlans = activityPlans.filter(p => p.area?.includes('실내') || p.activityName?.includes('실내'))
    return indoorPlans.length > 0 ? indoorPlans[0].activityName : '실내놀이 활동 (활동계획에서 불러오기)'
  }

  const handleDelete = (index: number) => {
    const newSchedule = schedule.filter((_, i) => i !== index)
    setSchedule(newSchedule)
  }

  const handleUp = (index: number) => {
    if (index > 0) {
      const newSchedule = [...schedule]
      ;[newSchedule[index - 1], newSchedule[index]] = [newSchedule[index], newSchedule[index - 1]]
      setSchedule(newSchedule)
    }
  }

  const handleDown = (index: number) => {
    if (index < schedule.length - 1) {
      const newSchedule = [...schedule]
      ;[newSchedule[index + 1], newSchedule[index]] = [newSchedule[index], newSchedule[index + 1]]
      setSchedule(newSchedule)
    }
  }

  const addRowHandler = () => {
    const newItem: ScheduleItem = {
      time: '',
      startTime: '',
      endTime: '',
      activity: '',
      execution: '',
      fixed: false
    }
    setSchedule([...schedule, newItem])
  }

  const handleScheduleChange = (index: number, field: keyof ScheduleItem, value: string) => {
    const newSchedule = [...schedule]
    newSchedule[index][field] = value
    setSchedule(newSchedule)
    if (field === 'activity') {
      setTodaySummary(`활동: ${value}`)
    }
  }

  const handleTimeChange = (index: number, isStart: boolean, value: string) => {
    const newSchedule = [...schedule]
    if (isStart) {
      newSchedule[index].startTime = value
    } else {
      newSchedule[index].endTime = value
      // Auto-fill next row's start time with current end time
      if (index < newSchedule.length - 1) {
        newSchedule[index + 1].startTime = value
        // Update next row's time display
        const baseTimeNext = newSchedule[index + 1].time.split(' (')[0]
        const rangeNext = (newSchedule[index + 1].startTime && newSchedule[index + 1].endTime) ? ` (${newSchedule[index + 1].startTime} ~ ${newSchedule[index + 1].endTime})` : ''
        newSchedule[index + 1].time = baseTimeNext + rangeNext
      }
    }
    const baseTime = newSchedule[index].time.split(' (')[0]
    const range = (newSchedule[index].startTime && newSchedule[index].endTime) ? ` (${newSchedule[index].startTime} ~ ${newSchedule[index].endTime})` : ''
    newSchedule[index].time = baseTime + range
    setSchedule(newSchedule)
  }

  const saveLog = async (isComplete = false) => {
    if (!classInfo) {
      alert('반 정보를 먼저 설정하세요.')
      return
    }
    if (isComplete && (!evaluationKeywords.trim() && !evaluationText.trim())) {
      alert('평가 내용을 입력하세요.')
      return
    }
    try {
      setApiLoading(true)
      const payload = {
        classId: classInfo.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        keywords: evaluationKeywords,
        evaluation: evaluationText,
        supportPlan: '', // Now handled separately in observations
        schedule: schedule.length > 0 ? schedule : null
      }
      let response
      if (logId) {
        response = await fetch(`/api/childcare-logs`, {
          method: 'POST', // Assuming no PUT, treat as update via POST
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch(`/api/childcare-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
      if (response.ok) {
        // 고정 일과 템플릿 저장 (로컬)
        try {
          const key = `fixedSchedule_${classInfo.id}`
          const fixedItems = (schedule || [])
            .filter(it => it.fixed && it.time)
            .map(it => ({
              label: it.time.split(' (')[0],
              startTime: it.startTime,
              endTime: it.endTime,
              activity: it.activity,
            }))
          localStorage.setItem(key, JSON.stringify(fixedItems))
        } catch (e) {
          // ignore
        }

        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
        if (isComplete) {
          alert('완료되었습니다. 내일 평가에 반영됩니다.')
        }
        loadDailyLog() // Reload
      } else {
        const error = await response.json()
        alert(`저장 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('저장 중 오류 발생')
    } finally {
      setApiLoading(false)
    }
  }

  const modifyLog = () => {
    // Enable editing, save will handle
    saveLog()
  }

  const generateEvaluation = async () => {
    if (!evaluationKeywords.trim()) {
      alert('키워드를 입력하세요.')
      return
    }
    if (!classInfo) {
      alert('반 정보를 설정하세요.')
      return
    }
    setLoading(true)
    try {
      const ageNum = parseInt(classInfo.age?.match(/\d+/)?.[0] || '0')
      const ageGroup = ageNum <= 2 ? '0-2' : '3-5'

      const res = await fetch('/api/generate-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: evaluationKeywords,
          date: format(selectedDate, 'yyyy-MM-dd'),
          ageGroup,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI 생성 실패')
      }

      const text: string = data.evaluation || ''
      if (!text.trim()) {
        throw new Error('AI 응답이 비어 있습니다.')
      }

      // Parse only 평가 및 지원계획
      const evalMatch = text.match(/^\*\*평가 및 지원계획:\*\*\s*([\s\S]*?)(^\*\*아동관찰:\*\*| $)/im)
      setEvaluationText(evalMatch ? evalMatch[1].trim() : text.trim())
    } catch (error) {
      console.error(error)
      alert('AI 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const completeLog = () => {
    saveLog(true)
  }

  const exportWeeklyPDF = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      alert('주간 기간을 선택하세요.')
      return
    }
    if (!classInfo) {
      alert('반 정보를 설정하세요.')
      return
    }
    setPdfLoading(true)
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd')
      const endDate = format(dateRange.to, 'yyyy-MM-dd')
      const classId = classInfo.id
      const childRes = await fetch(`/api/children?classId=${classId}`)
      let childMap: { [key: number]: string } = {}
      if (childRes.ok) {
        const childData = await childRes.json()
        childMap = (childData.children || []).reduce((map: any, c: any) => {
          map[c.id] = c.name
          return map
        }, {})
      }

      const response = await fetch(`/api/childcare-logs?classId=${classId}&startDate=${startDate}&endDate=${endDate}`)
      if (response.ok) {
        const weeklyLogs: ChildcareLog[] = await response.json()
        
        // Build weekly table HTML
        let tableHTML = `
          <div style="font-family: Arial, sans-serif; margin: 20px;">
            <h1 style="text-align: center;">주간보육일지</h1>
            <p><strong>반명:</strong> ${classInfo.className} (${classInfo.age}세)</p>
            <p><strong>기간:</strong> ${startDate} ~ ${endDate}</p>
            <p><strong>담임:</strong> [담임 교사명]</p>
            <p><strong>원장:</strong> [원장명]</p>
            <table border="1" style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr>
                  <th>이번 주 교사의 기대</th>
                  <th colspan="5">[기대 내용 입력]</th>
                </tr>
                <tr>
                  <th>요일/일과</th>
                  <th>월 (${format(addDays(dateRange.from, 0), 'MM-dd')})</th>
                  <th>화 (${format(addDays(dateRange.from, 1), 'MM-dd')})</th>
                  <th>수 (${format(addDays(dateRange.from, 2), 'MM-dd')})</th>
                  <th>목 (${format(addDays(dateRange.from, 3), 'MM-dd')})</th>
                  <th>금 (${format(addDays(dateRange.from, 4), 'MM-dd')})</th>
                </tr>
              </thead>
              <tbody>
        `
        
        const rowNames = ['등원 및 통합보육', '오전간식', '오전 실내놀이', '활동', '바깥놀이(대체)', '점심식사', '낮잠 및 휴식', '오후 놀이', '오후간식', '귀가 및 통합보육', '평가 및 지원계획', '아동관찰', '반 운영 특이사항']
        
        for (const rowName of rowNames) {
          tableHTML += `<tr><td>${rowName}</td>`
          for (let day = 0; day < 5; day++) {
            const dayDate = format(addDays(dateRange.from || new Date(), day), 'yyyy-MM-dd')
            const dayLog = weeklyLogs.find((log: any) => log.date === dayDate)
            let content = ''
            if (dayLog && dayLog.schedule) {
              if (rowName !== '평가 및 지원계획' && rowName !== '아동관찰' && rowName !== '반 운영 특이사항') {
                const item = dayLog.schedule.find((item: any) => item.time.includes(rowName.split(' (')[0]))
                content = item ? `${item.activity} (${item.execution || ''})` : ''
              }
            }
            if (rowName === '평가 및 지원계획') {
              content = dayLog ? (dayLog.evaluation || '').substring(0, 50) + '...' : ''
            } else if (rowName === '아동관찰') {
              try {
                const obsRes = await fetch(`/api/daily-observations?date=${dayDate}&classId=${classId}`)
                if (obsRes.ok) {
                  const obsList = await obsRes.json()
                  content = obsList.map((o: any) => {
                    const name = childMap[o.child_id] || 'Unknown'
                    const obsText = o.observation.length > 30 ? o.observation.substring(0, 30) + '...' : o.observation
                    return `${name}: ${obsText}`
                  }).join('<br/>')
                }
              } catch (err) {
                console.error('Obs fetch error:', err)
              }
            } else if (rowName === '반 운영 특이사항') {
              content = dayLog ? (dayLog.supportPlan || '').substring(0, 50) + '...' : ''
            }
            tableHTML += `<td style="vertical-align: top;">${content || ''}</td>`
          }
          tableHTML += '</tr>'
        }
        
        tableHTML += `
              </tbody>
            </table>
          </div>
        `
        
        const element = document.createElement('div')
        element.innerHTML = tableHTML
        document.body.appendChild(element)
        
        const opt = {
          margin: 1,
          filename: `주간보육일지_${startDate}_to_${endDate}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
        }
        
        await html2pdf().set(opt).from(element).save()
        document.body.removeChild(element)
      } else {
        alert('주간 데이터를 불러올 수 없습니다.')
      }
    } catch (error) {
      console.error('PDF export error:', error)
      alert('PDF 생성 중 오류 발생')
    } finally {
      setPdfLoading(false)
    }
  }

  if (apiLoading) {
    return <div className="container mx-auto p-4">로딩 중...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">보육일지</h1>
      
      <div className="bg-card p-4 rounded-lg shadow-md mb-4">
        <h2 className="text-xl font-semibold mb-2">반: {classInfo?.className || '설정 필요'} ({classInfo?.age || ''}세)</h2>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={
            hasScheduleDates.size > 0 ? {
              hasSchedule: Array.from(hasScheduleDates).map(d => new Date(d + 'T00:00:00'))
            } : {}
          }
          classNames={{
            day: cn('h-10 w-10 p-0 font-normal aria-selected:opacity-100'),
            day_selected: cn('bg-black text-white rounded-md aria-selected:bg-black aria-selected:text-white'),
            day_hasSchedule: cn('bg-gray-200 text-foreground hover:bg-gray-300 rounded-md')
          }}
        />
      </div>

      <div className="bg-card p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">일과표</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">순서</TableHead>
              <TableHead className="w-28">일과 고정</TableHead>
              <TableHead>일과</TableHead>
              <TableHead>시작 시간</TableHead>
              <TableHead>종료 시간</TableHead>
              <TableHead>활동</TableHead>
              <TableHead>실행 (o,x,확장,축소,대체)</TableHead>
              <TableHead>삭제</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="w-32">
                  <div className="flex items-center justify-between">
                    <div className="w-8">{index + 1}</div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUp(index)
                        }}
                        disabled={item.fixed || index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDown(index)
                        }}
                        disabled={item.fixed || index === schedule.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-28">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!item.fixed}
                      onChange={(e) => {
                        const newSchedule = [...schedule]
                        newSchedule[index].fixed = e.target.checked
                        if (e.target.checked && newSchedule[index].time) {
                          // Update display with range if times set
                          const baseTime = newSchedule[index].time.split(' (')[0]
                          const range = (newSchedule[index].startTime && newSchedule[index].endTime) ? ` (${newSchedule[index].startTime} ~ ${newSchedule[index].endTime})` : ''
                          newSchedule[index].time = baseTime + range
                        }
                        setSchedule(newSchedule)
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  {item.fixed ? (
                    <div className="text-sm font-medium">
                      {item.time.split(' (')[0]}
                    </div>
                  ) : (
                    <Input
                      value={item.time.split(' (')[0] || ''}
                      onChange={(e) => {
                        const newSchedule = [...schedule]
                        newSchedule[index].time = e.target.value
                        setSchedule(newSchedule)
                      }}
                      placeholder="일과 이름 입력"
                      className="h-8 text-sm"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {item.fixed ? (
                    <div className="text-center text-sm font-medium">
                      {item.startTime || ''}
                    </div>
                  ) : (
                    <Input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => handleTimeChange(index, true, e.target.value)}
                      className="w-full"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {item.fixed ? (
                    <div className="text-center text-sm font-medium">
                      {item.endTime || ''}
                    </div>
                  ) : (
                    <Input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => handleTimeChange(index, false, e.target.value)}
                      className="w-full"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {item.fixed ? (
                    <div className="text-center text-sm font-medium">
                      {item.activity || ''}
                    </div>
                  ) : (
                    <Input
                      value={item.activity}
                      onChange={(e) => handleScheduleChange(index, 'activity', e.target.value)}
                      className="w-full"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Select value={item.execution} onValueChange={(val) => handleScheduleChange(index, 'execution', val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="o">o</SelectItem>
                      <SelectItem value="x">x</SelectItem>
                      <SelectItem value="확장">확장</SelectItem>
                      <SelectItem value="축소">축소</SelectItem>
                      <SelectItem value="대체">대체</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-16">
                  {!item.fixed && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        handleDelete(index)
                      }}
                    >
                      삭제
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex gap-2 mt-4">
          <Button onClick={addRowHandler} className="bg-primary">
            일과추가
          </Button>
          <Button onClick={() => saveLog()} disabled={apiLoading}>
            저장
          </Button>
          <Button variant="outline" onClick={modifyLog} disabled={apiLoading}>
            수정
          </Button>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">평가 및 지원계획</h2>
        <div className="space-y-4">
          <div>
            <Label>키워드 입력</Label>
            <Textarea
              value={evaluationKeywords}
              onChange={(e) => setEvaluationKeywords(e.target.value)}
              placeholder="오늘 관찰 키워드..."
              className="mt-1"
            />
            <Button onClick={generateEvaluation} disabled={loading || !classInfo} className="mt-2">
              {loading ? '생성 중...' : 'AI생성'}
            </Button>
          </div>
          <div>
            <Label>평가 및 지원계획</Label>
            <Textarea
              value={evaluationText}
              onChange={(e) => setEvaluationText(e.target.value)}
              className="mt-1 h-32"
              placeholder="AI 생성 또는 직접 입력"
            />
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">아동관찰</h3>
          {children.length === 0 ? (
            <p className="text-muted-foreground">아동 목록을 불러올 수 없습니다. 우리반 관리를 확인하세요.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>아동 선택</TableHead>
                    <TableHead>관찰 내용</TableHead>
                    <TableHead className="w-24">AI 생성</TableHead>
                    <TableHead className="w-32">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observationRows.map((row: any, index: number) => (
                    <TableRow key={row.id || index}>
                      <TableCell>
                        <Select
                          value={row.childId ? row.childId.toString() : ''}
                          onValueChange={(val) => {
                            const newRows = [...observationRows]
                            newRows[index].childId = parseInt(val)
                            setObservationRows(newRows)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="아동 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {children.map((child: any) => (
                              <SelectItem key={child.id} value={child.id.toString()}>
                                {child.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={row.observation}
                          onChange={(e) => {
                            const newRows = [...observationRows]
                            newRows[index].observation = e.target.value
                            setObservationRows(newRows)
                          }}
                          className="h-20"
                          placeholder="관찰 내용 입력..."
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => generateChildObservation(index)}
                          disabled={obsLoading || !row.childId || !evaluationKeywords.trim()}
                          size="sm"
                          variant="outline"
                        >
                          {obsLoading ? '생성 중...' : 'AI생성'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => saveObservationRow(index)}
                            size="sm"
                            disabled={!row.childId || !row.observation.trim()}
                          >
                            저장
                          </Button>
                          <Button
                            onClick={() => deleteObservationRow(index)}
                            size="sm"
                            variant="destructive"
                          >
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={addObservationRow} className="mt-4" variant="outline">
                관찰 행 추가
              </Button>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={completeLog} disabled={apiLoading}>
            완료
          </Button>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" id="date-range">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                      </>
                    ) : (
                      format(dateRange.from, 'PPP')
                    )
                  ) : (
                    <span>기간 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  toDate={addDays(new Date(), 6)}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={exportWeeklyPDF} disabled={pdfLoading || !classInfo} variant="outline">
              {pdfLoading ? '생성 중...' : '주간 보육일지 PDF 출력/공유'}
            </Button>
          </div>
        </div>
        {isSaved && <p className="mt-2 text-green-600">저장되었습니다.</p>}
      </div>
      
      {classInfo === null && (
        <div className="bg-destructive/10 p-4 rounded-md">
          <p>반 정보를 설정하세요. <a href="/our-class" className="text-primary underline">우리반 관리로 이동</a></p>
        </div>
      )}
    </div>
  )

  const updateObservationRow = (index: number, field: string, value: any) => {
    const newRows = [...observationRows]
    newRows[index][field] = value
    setObservationRows(newRows)
  }

  const generateChildObservation = async (index: number) => {
    const row = observationRows[index]
    if (!row.childId || !evaluationKeywords.trim()) {
      alert('아동을 선택하고 키워드를 입력하세요.')
      return
    }
    const child = children.find((c: any) => c.id === row.childId)
    if (!child) {
      alert('아동 정보를 찾을 수 없습니다.')
      return
    }
    setObsLoading(true)
    try {
      const ageNum = parseInt(classInfo.age?.match(/\d+/)?.[0] || '0')
      const ageGroup = ageNum <= 2 ? '0-2' : '3-5'
      const curriculum = determineCurriculum(classInfo.age)
      const res = await fetch('/api/generate-child-observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: child.name,
          ageGroup,
          keywords: evaluationKeywords,
          date: format(selectedDate, 'yyyy-MM-dd'),
          curriculum
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        updateObservationRow(index, 'observation', data.observation)
      } else {
        alert(data.error || 'AI 생성 실패')
      }
    } catch (error) {
      console.error(error)
      alert('AI 생성 중 오류 발생')
    } finally {
      setObsLoading(false)
    }
  }

  const saveObservationRow = async (index: number) => {
    const row = observationRows[index]
    if (!row.childId || !row.observation.trim()) {
      alert('아동 선택과 관찰 내용을 입력하세요.')
      return
    }
    try {
      const payload = {
        classId: classInfo.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        childId: row.childId,
        observation: row.observation
      }
      let url = '/api/daily-observations'
      let method = 'POST'
      if (row.id) {
        url += `/${row.id}`
        method = 'PUT'
        payload.observation = row.observation // only update observation
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const data = await res.json()
        if (method === 'POST' && data.id) {
          updateObservationRow(index, 'id', data.id)
        }
        alert('저장되었습니다.')
        loadObservations() // reload to sync
      } else {
        const err = await res.json()
        alert(`저장 실패: ${err.error}`)
      }
    } catch (error) {
      console.error('Save obs error:', error)
      alert('저장 중 오류')
    }
  }

  const deleteObservationRow = async (index: number) => {
    const row = observationRows[index]
    if (!confirm('이 관찰을 삭제하시겠습니까?')) return
    if (row.id) {
      try {
        const res = await fetch(`/api/daily-observations/${row.id}`, { method: 'DELETE' })
        if (res.ok) {
          alert('삭제되었습니다.')
          loadObservations()
        } else {
          alert('삭제 실패')
        }
      } catch (error) {
        alert('삭제 중 오류')
      }
    } else {
      const newRows = observationRows.filter((_, i) => i !== index)
      setObservationRows(newRows)
    }
  }

  const addObservationRow = () => {
    setObservationRows([...observationRows, { childId: null, observation: '' }])
  }
}