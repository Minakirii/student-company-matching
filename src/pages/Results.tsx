import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { MapPin, Clock, DollarSign, ArrowLeft, TrendingUp } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const MEMBER_COLORS = ['#00F0FF', '#FF6B35', '#00B140', '#9B59B6', '#FF69B4', '#F4D03F']

export default function Results() {
  const navigate = useNavigate()
  const { recommendations, membersSummary, reset } = useAppStore()
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (recommendations.length === 0) {
      navigate('/configure')
      return
    }
  }, [recommendations, navigate])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !mapContainerRef.current) return

      const map = L.map(mapContainerRef.current).setView([22.55, 114.0], 12)
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      const bounds: L.LatLngTuple[] = []

      membersSummary.forEach((m, i) => {
        const color = MEMBER_COLORS[i % MEMBER_COLORS.length]
        L.marker([m.location.lat, m.location.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:16px;height:16px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 0 12px ${color}"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(map)
          .bindPopup(`<b>${m.name}</b>`)
        bounds.push([m.location.lat, m.location.lng])
      })

      recommendations.forEach((rec, i) => {
        const opacity = 1 - i * 0.08
        const color = '#FF6B35'
        L.circleMarker([rec.center.lat, rec.center.lng], {
          radius: 22 - i * 2,
          color,
          fillColor: color,
          fillOpacity: opacity * 0.2,
          weight: 2,
          opacity: opacity * 0.9,
        }).addTo(map).bindPopup(`
          <div style="color:#333;font-size:13px;min-width:160px">
            <b>#${i + 1} ${rec.areaName}</b><br/>
            <span style="color:#FF6B35">综合评分 ${rec.overallScore}</span><br/>
            <span style="color:#666">平均通勤 ${rec.avgCommuteMinutes}min</span><br/>
            <span style="color:#666">月租 ¥${rec.rentRange.min}-${rec.rentRange.max}</span>
          </div>
        `)

        L.marker([rec.center.lat, rec.center.lng], {
          icon: L.divIcon({
            className: 'rank-marker',
            html: `<div style="background:#FF6B35;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 0 8px rgba(255,107,53,0.6)">${i + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map)

        bounds.push([rec.center.lat, rec.center.lng])
      })

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [60, 60] })
      }
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBack = useCallback(() => {
    reset()
    navigate('/configure')
  }, [reset, navigate])

  const handleAreaClick = useCallback((areaId: string) => {
    navigate(`/results/${areaId}`)
  }, [navigate])

  if (recommendations.length === 0) return null

  return (
    <div className="h-screen bg-[#0A1929] text-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] z-20">
        <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>返回修改</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#0088CC] flex items-center justify-center">
            <MapPin className="w-4 h-4 text-[#0A1929]" />
          </div>
          <span className="text-lg font-bold">合租通</span>
        </div>
        <div className="flex items-center gap-3">
          {membersSummary.map((m, i) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length], boxShadow: `0 0 8px ${MEMBER_COLORS[i % MEMBER_COLORS.length]}` }} />
              <span className="text-sm text-gray-400">{m.name}</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="flex-1 flex">
        <div ref={mapContainerRef} className="flex-1 h-full" />

        <div className="w-[420px] overflow-y-auto border-l border-white/[0.06] bg-[#0D1F36] p-6 space-y-4">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00F0FF]" />
            推荐合租区域 Top {recommendations.length}
          </h3>

          {recommendations.map((rec, i) => (
            <div
              key={rec.areaId}
              onClick={() => handleAreaClick(rec.areaId)}
              className="group p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#FF6B35]/30 hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-[#FF6B35] text-white text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="font-semibold">{rec.areaName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400">{rec.district}</span>
                  </div>
                  {rec.label && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20">{rec.label}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#FF6B35]">{rec.overallScore}</div>
                  <div className="text-xs text-gray-500">综合评分</div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-3">
                {[
                  { label: '公平性', val: rec.scores.commuteFairness },
                  { label: '通勤', val: rec.scores.avgCommute },
                  { label: '租金', val: rec.scores.affordability },
                  { label: '配套', val: rec.scores.amenities },
                  { label: '体验', val: rec.scores.commuteExperience },
                ].map(dim => (
                  <div key={dim.label} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{dim.label}</div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] to-[#FF6B35]" style={{ width: `${dim.val}%` }} />
                    </div>
                    <div className="text-xs mt-0.5 text-gray-400">{dim.val}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />平均 {rec.avgCommuteMinutes}min</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />¥{rec.rentRange.min}-{rec.rentRange.max}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
