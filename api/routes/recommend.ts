import { Router, type Request, type Response } from 'express'
import { computeRecommendations } from '../services/recommendAlgorithm'
import { searchStations, getStationById } from '../services/metroService'

const router = Router()

const MEMBER_COLORS = ['#00F0FF', '#FF6B35', '#00B140', '#9B59B6', '#FF69B4', '#F4D03F']

router.post('/', (req: Request, res: Response) => {
  try {
    const { members } = req.body

    if (!members || !Array.isArray(members) || members.length < 2) {
      res.status(400).json({ success: false, error: '至少需要2个成员' })
      return
    }

    if (members.length > 6) {
      res.status(400).json({ success: false, error: '最多支持6个成员' })
      return
    }

    const memberInputs = members.map((m: any, i: number) => {
      let lat: number, lng: number

      if (m.stationId) {
        const station = getStationById(m.stationId)
        if (station) {
          lat = station.lat
          lng = station.lng
        } else {
          lat = m.lat
          lng = m.lng
        }
      } else {
        lat = m.lat
        lng = m.lng
      }

      return {
        id: m.id || `member_${i}`,
        name: m.name || `成员${i + 1}`,
        lat,
        lng,
        minRent: m.minRent ?? 0,
        maxRent: m.maxRent ?? 5000,
        minCommuteMinutes: m.minCommuteMinutes ?? 10,
        maxCommuteMinutes: m.maxCommuteMinutes ?? 60,
      }
    })

    const recommendations = computeRecommendations(memberInputs)

    const membersSummary = members.map((m: any, i: number) => ({
      id: m.id || `member_${i}`,
      name: m.name || `成员${i + 1}`,
      color: MEMBER_COLORS[i % MEMBER_COLORS.length],
      location: m.stationId
        ? (() => {
            const st = getStationById(m.stationId)
            return st ? { lat: st.lat, lng: st.lng } : { lat: m.lat, lng: m.lng }
          })()
        : { lat: m.lat, lng: m.lng },
    }))

    res.json({
      success: true,
      recommendations,
      membersSummary,
    })
  } catch (error) {
    console.error('Recommend error:', error)
    res.status(500).json({ success: false, error: '计算推荐区域时出错' })
  }
})

export default router
