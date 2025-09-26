"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface Child {
  id: number
  name: string
  birthdate: string
  classId: number
  className: string
  classAge: string
}

export default function ObservationLog() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchChildren()
  }, [])

  const fetchChildren = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/children')
      if (res.ok) {
        const kids = await res.json()
        setChildren(kids)
      } else {
        setError('아동 목록을 불러올 수 없습니다.')
      }
    } catch (err) {
      setError('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="container mx-auto p-4">로딩 중...</div>

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">관찰일지</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {children.length > 0 && (
        <p className="mb-4 text-lg font-medium text-muted-foreground">
          현재 반: {children[0].className} ({children[0].classAge})
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>아동 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {children.length === 0 ? (
            <p>아동이 없습니다. 우리반 관리에서 아동을 생성하세요.</p>
          ) : (
            children.map((child) => (
              <Link key={child.id} href={`/observation-log/${child.id}`}>
                <Button variant="outline" className="w-full justify-start mb-2">
                  {child.name} ({child.className})
                </Button>
              </Link>
            ))
          )}
          <Button onClick={() => window.location.reload()} variant="link" className="w-full justify-start">
            새로고침
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}