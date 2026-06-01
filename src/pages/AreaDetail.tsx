import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { ArrowLeft, Clock, Navigation, DollarSign, Building2, Utensils, Trees, Hospital, Train, Share2 } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts'

interface AmenityItem {
  key: string
  icon: typeof Train
  label: string
  format: (v: string[] | number) => string
  sub?: (v: string[] | number) => string
}

const AMENITY_ITEMS: AmenityItem[] = [
  { key: 'metroLines', icon: Train, label: '地铁线路', format: (v) => `${(v as string[]).length} 条`, sub: (v) => (v as string[]).join(', ') },
  { key: 'shoppingMalls', icon: Building2, label: '购物中心', format: (v) => `${v} 个` },
  { key: 'restaurants', icon: Utensils, label: '餐饮店铺', format: (v) => `${v} 家` },
  { key: 'parks', icon: Trees, label: '公园绿地', format: (v) => `${v} 个` },
  { key: 'hospitals', icon: Hospital, label: '医院', format: (v) => `${v} 家` },
]

const SCORE_DIMENSIONS = [
  { key: 'commuteFairness', label: '通勤公平性' },
  { key: 'avgCommute', label: '平均通勤' },
  { key: 'affordability', label: '租金可负担' },
  { key: 'amenities', label: '生活配套' },
  { key: 'commuteExperience', label: '通勤体验' },
] as const

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#0F2744', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' },
  labelStyle: { color: '#ccc' },
}

export default function AreaDetail() {
  const { areaId } = useParams<{ areaId: string }>()
  const navigate = useNavigate()
  const { recommendations, membersSummary } = useAppStore()
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const rec = recommendations.find(r => r.areaId === areaId)

  useEffect(() => {
    const fetchDetail = async () => {
      if (!areaId) return
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const memberIds = membersSummary.map(m => m.id).join(',')
        const res = await fetch(`/api/areas/${areaId}?memberStationIds=${memberIds}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (data.success) {
          setDetail(data)
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        console.error(err)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }
    fetchDetail()

    return () => {
      abortRef.current?.abort()
    }
  }, [areaId, membersSummary])

  const radarData = useMemo(() => {
    if (!detail) return []
    return [
      { name: '交通', value: Math.min(100, detail.amenities.metroLines.length * 25 + detail.amenities.metroStations * 10), fullMark: 100 },
      { name: '餐饮', value: Math.min(100, detail.amenities.restaurants / 1.2), fullMark: 100 },
      { name: '购物', value: Math.min(100, detail.amenities.shoppingMalls * 20), fullMark: 100 },
      { name: '医疗', value: Math.min(100, detail.amenities.hospitals * 25), fullMark: 100 },
      { name: '休闲', value: Math.min(100, detail.amenities.parks * 25), fullMark: 100 },
    ]
  }, [detail])

  const barData = useMemo(() => {
    if (!detail) return []
    return [
      { name: `${detail.areaName}`, 单间: detail.rentAnalysis.avgSingleRoom },
      { name: '深圳平均', 单间: detail.rentAnalysis.cityAvg },
    ]
  }, [detail])

  const handleBack = useCallback(() => {
    navigate('/results')
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1929] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#00F0FF]">加载中...</div>
      </div>
    )
  }

  if (!detail || !rec) {
    return (
      <div className="min-h-screen bg-[#0A1929] text-white flex items-center justify-center">
        <div className="text-gray-400">区域数据不可用</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1929] text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>返回推荐</span>
        </button>
        <span className="text-lg font-bold">区域详情</span>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] hover:border-[#00F0FF]/30 text-gray-400 hover:text-[#00F0FF] transition-all text-sm">
          <Share2 className="w-4 h-4" />
          分享
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/20 flex items-center justify-center text-[#FF6B35] text-lg font-bold">#1</div>
            <div>
              <h1 className="text-3xl font-bold">{detail.areaName}</h1>
              <span className="text-sm text-gray-400">{detail.district}区</span>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#FF6B35]">{rec.overallScore}</div>
              <div className="text-gray-500">综合评分</div>
            </div>
            <div className="w-px h-10 bg-white/[0.08]" />
            <div className="text-center">
              <div className="text-xl font-bold">{rec.avgCommuteMinutes}<span className="text-sm text-gray-400">min</span></div>
              <div className="text-gray-500">平均通勤</div>
            </div>
            <div className="w-px h-10 bg-white/[0.08]" />
            <div className="text-center">
              <div className="text-xl font-bold">¥{rec.rentRange.min}-{rec.rentRange.max}</div>
              <div className="text-gray-500">月租范围</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#00F0FF]" />
                通勤路线详情
              </h2>
              <div className="space-y-4">
                {detail.commuteRoutes.map((route: any, i: number) => {
                  const member = membersSummary.find((m: any) => m.id === route.memberStationId)
                  return (
                    <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: member?.color || '#00F0FF', boxShadow: `0 0 8px ${member?.color || '#00F0FF'}` }} />
                          <span className="font-medium">{member?.name || '成员'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-[#00F0FF] font-bold">{route.minutes}min</span>
                          <span className="text-gray-500">换乘 {route.transfers} 次</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
                        {route.route.map((s: any, j: number) => (
                          <span key={j} className="flex items-center gap-1">
                            <span className={j === 0 ? 'text-[#00F0FF]' : j === route.route.length - 1 ? 'text-[#FF6B35]' : ''}>
                              {s.station}
                            </span>
                            {j < route.route.length - 1 && <Navigation className="w-3 h-3 rotate-90" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#FF6B35]" />
                租金分析
              </h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: '#888' }} />
                    <YAxis tick={{ fill: '#888' }} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="单间" radius={[6, 6, 0, 0]}>
                      <Cell fill="#00F0FF" />
                      <Cell fill="rgba(0,240,255,0.3)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00F0FF]" />
                生活配套
              </h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar name="配套" dataKey="value" stroke="#00F0FF" fill="#00F0FF" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg font-semibold mb-4">配套设施统计</h2>
              <div className="space-y-3">
                {AMENITY_ITEMS.map((item) => {
                  const value: string[] | number = detail.amenities[item.key]
                  const formatted = item.format(value)
                  const subValue = item.sub ? item.sub(value) : undefined
                  return (
                    <div key={item.key} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <item.icon className="w-4 h-4 text-[#00F0FF]/60" />
                        {item.label}
                      </div>
                      <div className="text-sm text-right">
                        <div className="text-white">{formatted}</div>
                        {subValue && <div className="text-xs text-gray-600">{subValue}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg font-semibold mb-3">评分维度</h2>
              <div className="space-y-3">
                {SCORE_DIMENSIONS.map(dim => {
                  const val = rec.scores[dim.key]
                  return (
                    <div key={dim.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{dim.label}</span>
                        <span className="text-[#00F0FF]">{val}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] to-[#FF6B35] transition-all duration-1000" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
