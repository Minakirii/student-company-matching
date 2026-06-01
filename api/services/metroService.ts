import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const metroData = JSON.parse(
  readFileSync(path.join(__dirname, '../data/shenzhen-metro.json'), 'utf-8')
)

interface MetroStation {
  id: string
  name: string
  lat: number
  lng: number
  transfers: string[]
}

interface MetroLine {
  id: string
  name: string
  color: string
  stations: MetroStation[]
  edges: { from: string; to: string; minutes: number }[]
}

const lines: MetroLine[] = metroData.lines

function buildStationMap() {
  const stationMap = new Map<string, MetroStation>()
  for (const line of lines) {
    for (const st of line.stations) {
      stationMap.set(st.id, st)
    }
  }
  return stationMap
}

const stationMap = buildStationMap()

function buildGraph() {
  const graph = new Map<string, Map<string, { minutes: number; lineId: string }>>()

  for (const line of lines) {
    for (const edge of line.edges) {
      if (!graph.has(edge.from)) graph.set(edge.from, new Map())
      if (!graph.has(edge.to)) graph.set(edge.to, new Map())
      graph.get(edge.from)!.set(edge.to, { minutes: edge.minutes, lineId: line.id })
      graph.get(edge.to)!.set(edge.from, { minutes: edge.minutes, lineId: line.id })
    }
  }

  for (const line of lines) {
    for (const st of line.stations) {
      if (st.transfers.length > 0) {
        const node = graph.get(st.id)
        if (!node) continue
        for (const otherLineId of st.transfers) {
          for (const otherLine of lines) {
            if (otherLine.id === otherLineId) {
              for (const otherSt of otherLine.stations) {
                if (otherSt.name === st.name && otherSt.id !== st.id) {
                  if (!graph.has(otherSt.id)) graph.set(otherSt.id, new Map())
                  graph.get(st.id)!.set(otherSt.id, { minutes: 3, lineId: 'transfer' })
                  graph.get(otherSt.id)!.set(st.id, { minutes: 3, lineId: 'transfer' })
                }
              }
            }
          }
        }
      }
    }
  }

  return graph
}

const metroGraph = buildGraph()

export function findNearestStation(lat: number, lng: number): MetroStation | null {
  let nearest: MetroStation | null = null
  let minDist = Infinity

  for (const st of stationMap.values()) {
    const dist = Math.sqrt((lat - st.lat) ** 2 + (lng - st.lng) ** 2)
    if (dist < minDist) {
      minDist = dist
      nearest = st
    }
  }
  return nearest
}

interface RouteNode {
  stationId: string
  minutes: number
  transfers: number
  path: string[]
  lines: string[]
}

export function shortestPath(fromStationId: string, toStationId: string): RouteNode | null {
  const dist = new Map<string, RouteNode>()
  const visited = new Set<string>()

  dist.set(fromStationId, {
    stationId: fromStationId,
    minutes: 0,
    transfers: 0,
    path: [fromStationId],
    lines: [],
  })

  const pq: RouteNode[] = [
    { stationId: fromStationId, minutes: 0, transfers: 0, path: [fromStationId], lines: [] },
  ]

  while (pq.length > 0) {
    pq.sort((a, b) => a.minutes - b.minutes)
    const current = pq.shift()!

    if (current.stationId === toStationId) {
      return current
    }

    if (visited.has(current.stationId)) continue
    visited.add(current.stationId)

    const neighbors = metroGraph.get(current.stationId)
    if (!neighbors) continue

    for (const [neighborId, edge] of neighbors) {
      if (visited.has(neighborId)) continue

      const isTransfer = edge.lineId === 'transfer'
      const newTransfers = isTransfer ? current.transfers + 1 : current.transfers
      const newMinutes = current.minutes + edge.minutes + (isTransfer ? 3 : 0)
      const newLines = [...current.lines]
      if (edge.lineId !== 'transfer' && newLines[newLines.length - 1] !== edge.lineId) {
        newLines.push(edge.lineId)
      }

      const existing = dist.get(neighborId)
      if (!existing || newMinutes < existing.minutes) {
        const node: RouteNode = {
          stationId: neighborId,
          minutes: newMinutes,
          transfers: newTransfers,
          path: [...current.path, neighborId],
          lines: newLines,
        }
        dist.set(neighborId, node)
        pq.push(node)
      }
    }
  }

  return null
}

export function getStationById(id: string): MetroStation | undefined {
  return stationMap.get(id)
}

export function getStationName(id: string): string {
  return stationMap.get(id)?.name || id
}

export function getLineColor(lineId: string): string {
  const line = lines.find(l => l.id === lineId)
  return line?.color || '#999'
}

export function getLineName(lineId: string): string {
  const line = lines.find(l => l.id === lineId)
  return line?.name || lineId
}

export function getAllStationNames(): string[] {
  return [...stationMap.values()].map(s => s.name)
}

export function searchStations(query: string): MetroStation[] {
  const q = query.toLowerCase()
  return [...stationMap.values()].filter(
    s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  )
}

export function getAllStations(): MetroStation[] {
  return [...stationMap.values()]
}
