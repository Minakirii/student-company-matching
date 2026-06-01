import { Router, type Request, type Response } from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { searchStations } from '../services/metroService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const landmarksData = JSON.parse(
  readFileSync(path.join(__dirname, '../data/landmarks.json'), 'utf-8')
)

const router = Router()

router.get('/search', (req: Request, res: Response) => {
  const q = (req.query.q as string) || ''
  const results: any[] = []

  const metroStations = searchStations(q)
  for (const st of metroStations.slice(0, 5)) {
    results.push({
      id: st.id,
      name: `${st.name}（地铁站）`,
      type: 'metro_station',
      lat: st.lat,
      lng: st.lng,
      metroLines: st.transfers,
    })
  }

  const matchedLandmarks = landmarksData.landmarks.filter(
    (lm: any) => lm.name.toLowerCase().includes(q.toLowerCase())
  )
  for (const lm of matchedLandmarks.slice(0, 5)) {
    results.push({
      id: lm.id,
      name: lm.name,
      type: lm.type === 'university' ? 'university' : 'business_district',
      lat: lm.lat,
      lng: lm.lng,
      metroLines: [],
    })
  }

  res.json({ places: results })
})

export default router
