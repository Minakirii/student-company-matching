import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { findNearestStation, shortestPath, getStationById, getStationName, getLineName, getLineColor } from './metroService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rentalData = JSON.parse(
  readFileSync(path.join(__dirname, '../data/rental-data.json'), 'utf-8')
)

interface MemberInput {
  id: string
  name: string
  lat: number
  lng: number
  minRent: number
  maxRent: number
  minCommuteMinutes: number
  maxCommuteMinutes: number
}

interface AreaCandidate {
  areaId: string
  areaName: string
  district: string
  lat: number
  lng: number
  stationId: string
  commuteTimes: { memberId: string; minutes: number; transfers: number }[]
}

export function computeRecommendations(members: MemberInput[]) {
  const areaCandidates: AreaCandidate[] = []

  for (const area of rentalData.areas) {
    const areaStation = findNearestStation(area.lat, area.lng)
    if (!areaStation) continue

    const commuteTimes: { memberId: string; minutes: number; transfers: number }[] = []
    let allReachable = true

    for (const member of members) {
      const memberStation = findNearestStation(member.lat, member.lng)
      if (!memberStation) {
        allReachable = false
        break
      }
      const route = shortestPath(areaStation.id, memberStation.id)
      if (!route) {
        allReachable = false
        break
      }
      commuteTimes.push({
        memberId: member.id,
        minutes: route.minutes,
        transfers: route.transfers,
      })
    }

    const areaData = rentalData.areas.find((a: any) => a.areaId === area.areaId)

    if (allReachable) {
      let passesAllConstraints = true
      for (let i = 0; i < members.length; i++) {
        const member = members[i]
        const commute = commuteTimes[i]

        if (member.maxRent > 0 && areaData && areaData.avgSingleRoom > member.maxRent) {
          passesAllConstraints = false
          break
        }
        if (member.minRent > 0 && areaData && areaData.avgSingleRoom < member.minRent) {
          passesAllConstraints = false
          break
        }

        if (member.maxCommuteMinutes > 0 && commute.minutes > member.maxCommuteMinutes) {
          passesAllConstraints = false
          break
        }
        if (member.minCommuteMinutes > 0 && commute.minutes < member.minCommuteMinutes) {
          passesAllConstraints = false
          break
        }
      }

      if (passesAllConstraints) {
        areaCandidates.push({
          areaId: area.areaId,
          areaName: area.areaName,
          district: area.district,
          lat: area.lat,
          lng: area.lng,
          stationId: areaStation.id,
          commuteTimes,
        })
      }
    }
  }

  const scored = areaCandidates.map(candidate => {
    const times = candidate.commuteTimes.map(t => t.minutes)
    const maxTime = Math.max(...times)
    const minTime = Math.min(...times)
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length

    const commuteFairness = maxTime > 0 ? (1 - (maxTime - minTime) / maxTime) * 100 : 100
    const avgCommuteScore = Math.max(0, 100 - avgTime * 1.5)

    const areaData = rentalData.areas.find((a: any) => a.areaId === candidate.areaId)
    const affordability = areaData?.rentScore || 50

    const amenities = rentalData.amenities[candidate.areaId]
    let amenitiesScore = 50
    if (amenities) {
      amenitiesScore = Math.min(100,
        amenities.metroLines.length * 10 +
        amenities.shoppingMalls * 5 +
        Math.min(amenities.restaurants / 2, 20) +
        amenities.parks * 5 +
        amenities.hospitals * 5
      )
    }

    const totalTransfers = candidate.commuteTimes.reduce((a, b) => a + b.transfers, 0)
    const transferScore = Math.max(0, 100 - totalTransfers * 10)

    const overallScore = Math.round(
      commuteFairness * 0.40 +
      avgCommuteScore * 0.25 +
      affordability * 0.20 +
      amenitiesScore * 0.10 +
      transferScore * 0.05
    )

    const labels: string[] = []
    if (commuteFairness >= 85) labels.push('最佳公平性')
    if (avgCommuteScore >= 70) labels.push('最短总通勤')
    if (affordability >= 85) labels.push('最优性价比')
    if (amenitiesScore >= 70) labels.push('最佳生活配套')

    return {
      areaId: candidate.areaId,
      areaName: candidate.areaName,
      district: candidate.district,
      center: { lat: candidate.lat, lng: candidate.lng },
      overallScore,
      scores: {
        commuteFairness: Math.round(commuteFairness),
        avgCommute: Math.round(avgCommuteScore),
        affordability: Math.round(affordability),
        amenities: Math.round(amenitiesScore),
        commuteExperience: Math.round(transferScore),
      },
      avgCommuteMinutes: Math.round(avgTime),
      maxCommuteMinutes: Math.round(maxTime),
      rentRange: {
        min: areaData?.avgSharedRoom || 0,
        max: areaData?.avgMasterRoom || 0,
      },
      label: labels[0] || '',
      tags: labels,
    }
  })

  scored.sort((a, b) => b.overallScore - a.overallScore)
  return scored.slice(0, 5)
}

export function getAreaDetail(areaId: string, memberStationIds: string[]) {
  const areaData = rentalData.areas.find((a: any) => a.areaId === areaId)
  if (!areaData) return null

  const amenities = rentalData.amenities[areaId]
  const cityAvg = rentalData.cityAvg

  const commuteRoutes: any[] = []

  for (const memberStationId of memberStationIds) {
    const areaStation = findNearestStation(areaData.lat, areaData.lng)
    if (!areaStation) continue

    const memberStation = getStationById(memberStationId)
    if (!memberStation) continue

    const route = shortestPath(areaStation.id, memberStation.id)
    if (!route) continue

    const routeStations = route.path.map(id => {
      const st = getStationById(id)
      return {
        station: st?.name || id,
        line: route.lines[0] || '',
      }
    })

    commuteRoutes.push({
      memberStationId,
      minutes: route.minutes,
      transfers: route.transfers,
      route: routeStations,
    })
  }

  return {
    areaId,
    areaName: areaData.areaName,
    district: areaData.district,
    center: { lat: areaData.lat, lng: areaData.lng },
    rentAnalysis: {
      avgSingleRoom: areaData.avgSingleRoom,
      cityAvg: cityAvg.singleRoom,
      trend: 'stable' as const,
    },
    amenities: amenities || {
      metroStations: 1,
      metroLines: [],
      shoppingMalls: 0,
      restaurants: 0,
      parks: 0,
      hospitals: 0,
    },
    commuteRoutes,
  }
}

export function getAreaRentalInfo(areaId: string) {
  return {
    ...rentalData.areas.find((a: any) => a.areaId === areaId),
    cityAvg: rentalData.cityAvg,
    amenities: rentalData.amenities[areaId],
  }
}
