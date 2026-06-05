import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Plus, Trash2, ArrowRight, Loader2, MapPin, Navigation, ChevronDown, ChevronUp, DollarSign, Clock } from 'lucide-react'

interface PlaceOption {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  metroLines: string[]
}

const MEMBER_EMOJIS = ['😎', '🤓', '😊', '🫡', '🥳', '😌']

export default function Configure() {
  const navigate = useNavigate()
  const { members, addMember, removeMember, updateMember, setRecommendations, setLoading, loading } = useAppStore()

  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<Record<string, PlaceOption[]>>({})
  const [selectedPlaces, setSelectedPlaces] = useState<Record<string, PlaceOption | null>>({})
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({})
  const abortControllersRef = useRef<Record<string, AbortController>>({})
  const searchTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const requestSeqRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (members.length < 2) {
      addMember()
    }
    const controllers = abortControllersRef.current
    const timers = searchTimersRef.current
    return () => {
      Object.values(controllers).forEach(ctrl => ctrl.abort())
      Object.values(timers).forEach(timer => clearTimeout(timer))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleExpand = useCallback((memberId: string) => {
    setExpandedMembers(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }, [])

  const cancelSearchTask = useCallback((memberId: string) => {
    const timer = searchTimersRef.current[memberId]
    if (timer) clearTimeout(timer)
    delete searchTimersRef.current[memberId]

    abortControllersRef.current[memberId]?.abort()
    delete abortControllersRef.current[memberId]
  }, [])

  const searchPlace = useCallback((memberId: string, query: string) => {
    setSearchQueries(prev => ({ ...prev, [memberId]: query }))
    cancelSearchTask(memberId)

    if (!query.trim()) {
      setSuggestions(prev => ({ ...prev, [memberId]: [] }))
      return
    }

    const requestId = (requestSeqRef.current[memberId] ?? 0) + 1
    requestSeqRef.current[memberId] = requestId

    searchTimersRef.current[memberId] = setTimeout(async () => {
      const controller = new AbortController()
      abortControllersRef.current[memberId] = controller

      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (requestSeqRef.current[memberId] !== requestId) return
        setSuggestions(prev => ({ ...prev, [memberId]: data.places || [] }))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (requestSeqRef.current[memberId] !== requestId) return
        setSuggestions(prev => ({ ...prev, [memberId]: [] }))
      }
    }, 300)
  }, [cancelSearchTask])

  const selectPlace = useCallback((memberId: string, place: PlaceOption) => {
    cancelSearchTask(memberId)
    setSelectedPlaces(prev => ({ ...prev, [memberId]: place }))
    setSearchQueries(prev => ({ ...prev, [memberId]: place.name }))
    setSuggestions(prev => ({ ...prev, [memberId]: [] }))
    updateMember(memberId, {
      placeName: place.name,
      stationId: place.type === 'metro_station' ? place.id : '',
      lat: place.lat,
      lng: place.lng,
    })
  }, [updateMember, cancelSearchTask])

  const canCompute = useMemo(
    () => members.every(m => m.lat !== 0 && m.lng !== 0) && members.length >= 2,
    [members]
  )

  const compute = useCallback(async () => {
    if (!canCompute) return
    setLoading(true)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members: members.map(m => ({
            id: m.id,
            name: m.name || m.placeName,
            stationId: m.stationId,
            lat: m.lat,
            lng: m.lng,
            minRent: m.minRent,
            maxRent: m.maxRent,
            minCommuteMinutes: m.minCommuteMinutes,
            maxCommuteMinutes: m.maxCommuteMinutes,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRecommendations(data.recommendations, data.membersSummary)
        navigate('/results')
      }
    } catch (err) {
      console.error('Compute error:', err)
    } finally {
      setLoading(false)
    }
  }, [canCompute, members, setLoading, setRecommendations, navigate])

  const handleNameChange = useCallback((memberId: string, value: string) => {
    updateMember(memberId, { name: value })
  }, [updateMember])

  const handleMinRentChange = useCallback((memberId: string, value: number) => {
    updateMember(memberId, { minRent: value })
  }, [updateMember])

  const handleMaxRentChange = useCallback((memberId: string, value: number) => {
    updateMember(memberId, { maxRent: value })
  }, [updateMember])

  const handleMinCommuteChange = useCallback((memberId: string, value: number) => {
    updateMember(memberId, { minCommuteMinutes: value })
  }, [updateMember])

  const handleMaxCommuteChange = useCallback((memberId: string, value: number) => {
    updateMember(memberId, { maxCommuteMinutes: value })
  }, [updateMember])

  return (
    <div className="min-h-screen bg-[#0A1929] text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/[0.06]">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#0088CC] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#0A1929]" />
          </div>
          <span className="text-xl font-bold">合租通</span>
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-2">配置合租伙伴</h2>
          <p className="text-gray-400">输入每个人上班或上学的地点，系统帮你找到最优合租区域</p>
        </div>

        <div className="space-y-4">
          {members.map((member, i) => {
            const isExpanded = expandedMembers[member.id] || false
            return (
            <div
              key={member.id}
              className="relative rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#00F0FF]/10 transition-all overflow-hidden"
            >
              <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-[#FF6B35]/10 flex items-center justify-center text-2xl">
                  {MEMBER_EMOJIS[i % MEMBER_EMOJIS.length]}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    placeholder={`合租伙伴 ${i + 1} 的名字`}
                    value={member.name}
                    onChange={e => handleNameChange(member.id, e.target.value)}
                    className="w-48 bg-transparent border-b border-white/10 text-lg font-medium pb-1 outline-none focus:border-[#00F0FF]/50 transition-colors placeholder-gray-600"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="输入上班/上学地点（公司名、地铁站、学校名）"
                      value={searchQueries[member.id] || ''}
                      onChange={e => searchPlace(member.id, e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white outline-none focus:border-[#00F0FF]/30 transition-all placeholder-gray-600"
                    />
                    {suggestions[member.id]?.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F2744] border border-white/[0.1] rounded-xl overflow-hidden z-50 shadow-2xl">
                        {suggestions[member.id].map(place => (
                          <button
                            key={place.id}
                            onClick={() => selectPlace(member.id, place)}
                            className="w-full text-left px-4 py-3 hover:bg-[#00F0FF]/10 transition-colors flex items-center gap-3"
                          >
                            <Navigation className="w-4 h-4 text-[#00F0FF]/60" />
                            <div>
                              <div className="text-sm">{place.name}</div>
                              <div className="text-xs text-gray-500">{place.type === 'metro_station' ? '地铁站' : place.type === 'university' ? '学校' : '商区'}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedPlaces[member.id] && (
                    <div className="flex items-center gap-2 text-sm text-[#00F0FF]/70">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>已选择：{selectedPlaces[member.id]?.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleExpand(member.id)}
                    className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-[#00F0FF] transition-all"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {members.length > 2 && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-white/[0.06] bg-white/[0.01]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <DollarSign className="w-4 h-4 text-[#FF6B35]/60" />
                        月租预算范围
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          step={100}
                          value={member.minRent}
                          onChange={e => handleMinRentChange(member.id, Number(e.target.value))}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B35]/30 transition-all"
                          placeholder="最低"
                        />
                        <span className="text-gray-600">—</span>
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          step={100}
                          value={member.maxRent}
                          onChange={e => handleMaxRentChange(member.id, Number(e.target.value))}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B35]/30 transition-all"
                          placeholder="最高"
                        />
                        <span className="text-xs text-gray-500 shrink-0">元/月</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <Clock className="w-4 h-4 text-[#00F0FF]/60" />
                        通勤时间范围
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={120}
                          step={5}
                          value={member.minCommuteMinutes}
                          onChange={e => handleMinCommuteChange(member.id, Number(e.target.value))}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00F0FF]/30 transition-all"
                          placeholder="最短"
                        />
                        <span className="text-gray-600">—</span>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          step={5}
                          value={member.maxCommuteMinutes}
                          onChange={e => handleMaxCommuteChange(member.id, Number(e.target.value))}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00F0FF]/30 transition-all"
                          placeholder="最长"
                        />
                        <span className="text-xs text-gray-500 shrink-0">分钟</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={addMember}
            disabled={members.length >= 6}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] hover:border-[#00F0FF]/30 text-gray-400 hover:text-[#00F0FF] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            添加成员（{members.length}/6）
          </button>

          <button
            onClick={compute}
            disabled={!canCompute || loading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF5722] text-white font-semibold hover:shadow-[0_0_30px_rgba(255,107,53,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
            {loading ? '计算中...' : '开始计算'}
          </button>
        </div>
      </div>
    </div>
  )
}
