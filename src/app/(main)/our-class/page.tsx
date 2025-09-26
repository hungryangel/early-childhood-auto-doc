"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Child {
  id: number
  name: string
  birthdate: string
  classId: number
  className: string
  classAge: string
}

interface ClassInfo {
  id: number
  age: string
  className: string
}

export default function OurClass() {
  const [classAge, setClassAge] = useState('')
  const [className, setClassName] = useState('')
  const [childName, setChildName] = useState('')
  const [childBirthdate, setChildBirthdate] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)

  useEffect(() => {
    fetchChildren()
    fetchClass()
  }, [])

  const fetchClass = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/classes')
      if (res.ok) {
        const classes = await res.json()
        if (classes.length > 0) {
          const cls = classes[0]
          setClassInfo(cls)
          setClassAge(cls.age)
          setClassName(cls.className)
        }
      }
    } catch (err) {
      setError('반 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchChildren = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/children')
      if (res.ok) {
        const kids = await res.json()
        setChildren(kids)
      }
    } catch (err) {
      setError('아동 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const calculateAgeInMonths = (birthdate: string): string => {
    const birth = new Date(birthdate)
    const today = new Date()
    let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
    if (today.getDate() < birth.getDate()) months--
    return `${months > 0 ? months : 0}개월`
  }

  const handleClassComplete = async () => {
    if (classAge && className) {
      try {
        setLoading(true)
        setError('')
        let res;
        if (classInfo) {
          // Update existing
          res = await fetch(`/api/classes?id=${classInfo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ age: classAge, className })
          })
        } else {
          // Create new
          res = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ age: classAge, className })
          })
        }
        if (res.ok) {
          fetchClass()
          toast.success(`저장 완료: 반 정보가 저장되었습니다.`)
        } else {
          const err = await res.json()
          setError(err.error || '저장 실패')
          toast.error(`저장 실패: ${err.error || '저장 실패'}`)
        }
      } catch (err) {
        setError('저장 중 오류가 발생했습니다.')
        toast.error("오류: 저장 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }
  }

  const addChild = async () => {
    if (!classInfo) {
      setError('반 정보를 먼저 설정하세요.')
      toast.error("오류: 반 정보를 먼저 설정하세요.")
      return
    }
    if (childName && childBirthdate) {
      try {
        setLoading(true)
        setError('')
        const payload = { 
          name: childName.trim(), 
          birthdate: childBirthdate, 
          classId: classInfo.id 
        }
        const res = await fetch('/api/children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          const text = await res.text()
          let newChild
          try {
            newChild = JSON.parse(text)
          } catch (parseErr) {
            console.error('Parse error:', parseErr)
            throw new Error('Invalid response format from server')
          }
          setChildren([...children, newChild])
          setChildName('')
          setChildBirthdate('')
          toast.success("생성 완료: 아동이 생성되었습니다.")
        } else {
          const text = await res.text()
          let err
          try {
            err = JSON.parse(text)
          } catch (parseErr) {
            console.error('Parse error in error response:', text.substring(0, 100))
            err = { error: `HTTP ${res.status} - ${text.substring(0, 100)}` }
          }
          const errorMsg = err.error || '생성 실패'
          setError(errorMsg)
          toast.error(`생성 실패: ${errorMsg}`)
        }
      } catch (err) {
        console.error('Add child error:', err)
        setError('생성 중 오류가 발생했습니다.')
        toast.error(`오류: ${err.message || '생성 중 오류가 발생했습니다.'}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDeleteChild = async (childId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/children/${childId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success(`삭제 완료: ${data.deletedChild.name} 아동과 관련 데이터가 삭제되었습니다.`)
        // Refresh children list
        await fetchChildren()
      } else {
        const err = await res.json()
        toast.error(`삭제 실패: ${err.error || '아동 삭제에 실패했습니다.'}`)
      }
    } catch (err: any) {
      toast.error("오류: 삭제 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (loading && children.length === 0) {
    return <div className="container mx-auto p-4">로딩 중...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">우리반 관리</h1>
      
      {error && <p className="text-red-600 mb-4">{error}</p>}
      
      <div className="bg-card p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">반 정보 설정</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="classAge">연령</Label>
            <Input
              id="classAge"
              value={classAge}
              onChange={(e) => setClassAge(e.target.value)}
              placeholder="예: 만 3세"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="className">반명</Label>
            <Input
              id="className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="예: 나비반"
              className="mt-1"
            />
          </div>
          <Button onClick={handleClassComplete} disabled={loading || !classAge || !className}>
            {loading ? '저장 중...' : '완료'}
          </Button>
        </div>
        {classInfo && <p className="mt-2 text-green-600">반 정보가 적용되었습니다.</p>}
      </div>

      <div className="bg-card p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl font-semibold mb-4">아동 관리</h2>
        {!classInfo && <p className="text-yellow-600 mb-4">반 정보를 먼저 설정하세요.</p>}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="childName">아동명</Label>
              <Input
                id="childName"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="이름 입력"
                className="mt-1"
                disabled={!classInfo || loading}
              />
            </div>
            <div>
              <Label htmlFor="childBirthdate">생년월일</Label>
              <Input
                id="childBirthdate"
                type="date"
                value={childBirthdate}
                onChange={(e) => setChildBirthdate(e.target.value)}
                className="mt-1"
                disabled={!classInfo || loading}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={addChild} 
                disabled={loading || !childName || !childBirthdate || !classInfo}
              >
                {loading ? '생성 중...' : '생성'}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">
            {classInfo ? `아동 목록 (${className}, ${classAge})` : '아동 목록'}
          </h3>
          {children.length === 0 ? (
            <p>아동이 없습니다. 위에서 생성하세요.</p>
          ) : (
            <ul className="space-y-2">
              {children
                .filter(child => !classInfo || child.classId === classInfo.id)
                .map((child) => (
                <li key={child.id} className="flex justify-between items-center p-3 bg-muted rounded">
                  <span>{child.name} - {calculateAgeInMonths(child.birthdate)}</span>
                  <div className="space-x-2">
                    <Link href={`/observation-log/${child.id}`}>
                      <Button variant="outline" size="sm">관찰일지</Button>
                    </Link>
                    <Link href={`/development-evaluation/${child.id}`}>
                      <Button variant="outline" size="sm">발달평가서</Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setSelectedChildId(child.id)}
                        >
                          삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>아동 삭제 확인</AlertDialogTitle>
                          <AlertDialogDescription>
                            {child.name} 아동을 삭제하시겠습니까? 이 작업은 해당 아동의 모든 관찰일지와 발달평가서도 함께 삭제합니다. 복구할 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => {
                              if (selectedChildId === child.id) {
                                handleDeleteChild(child.id)
                              }
                              setSelectedChildId(null)
                            }}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}