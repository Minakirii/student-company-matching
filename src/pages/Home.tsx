import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Search } from 'lucide-react'

const STEPS = [
  { icon: Users, title: '添加合租伙伴', desc: '输入2-6人的工作或学校地址' },
  { icon: MapPin, title: '智能分析', desc: '基于深圳地铁计算最优区域' },
  { icon: Search, title: '查看推荐', desc: '地图可视化 + 通勤时间对比' },
] as const

export default function Home() {
  const navigate = useNavigate()

  const handleStart = useCallback(() => {
    navigate('/configure')
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#0A1929] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 30% 40%, #00F0FF 1px, transparent 1px),
          radial-gradient(circle at 70% 60%, #FF6B35 1px, transparent 1px)`,
        backgroundSize: '60px 60px, 80px 80px',
      }} />

      <nav className="relative z-10 flex items-center px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#0088CC] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#0A1929]" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
            合租通
          </span>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-88px)] px-4 text-center">
        <div className="max-w-3xl">
          <h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
            在深圳，
            <br />
            <span className="bg-gradient-to-r from-[#00F0FF] to-[#FF6B35] bg-clip-text text-transparent">
              找到属于你们的合租点
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed">
            多人不同地点上班上学？输入各自的地址，智能计算最公平、最方便的合租区域，
            让每个人都能接受通勤
          </p>
          <button
            onClick={handleStart}
            className="group relative px-10 py-4 bg-[#FF6B35] hover:bg-[#FF5722] text-white text-lg font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,107,53,0.5)] hover:-translate-y-0.5"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Search className="w-5 h-5" />
              开始计算合租位置
            </span>
          </button>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-[#00F0FF]/20 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-transparent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <step.icon className="w-6 h-6 text-[#00F0FF]" />
              </div>
              <div className="text-xs text-[#00F0FF]/60 font-mono mb-2">0{i + 1}</div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-[#00F0FF]/5 to-transparent rounded-t-full blur-3xl pointer-events-none" />
    </div>
  )
}
