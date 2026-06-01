import { Router, type Request, type Response } from 'express'
import { getAreaDetail } from '../services/recommendAlgorithm'

const router = Router()

router.get('/:areaId', (req: Request, res: Response) => {
  try {
    const { areaId } = req.params
    const memberStationIds = (req.query.memberStationIds as string || '').split(',').filter(Boolean)

    const detail = getAreaDetail(areaId, memberStationIds)

    if (!detail) {
      res.status(404).json({ success: false, error: '区域未找到' })
      return
    }

    res.json({ success: true, ...detail })
  } catch (error) {
    console.error('Area detail error:', error)
    res.status(500).json({ success: false, error: '获取区域详情时出错' })
  }
})

export default router
