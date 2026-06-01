import { create } from 'zustand'

interface MemberLocation {
  id: string
  name: string
  placeName: string
  stationId: string
  lat: number
  lng: number
  minRent: number
  maxRent: number
  minCommuteMinutes: number
  maxCommuteMinutes: number
}

interface RecommendArea {
  areaId: string
  areaName: string
  district: string
  center: { lat: number; lng: number }
  overallScore: number
  scores: {
    commuteFairness: number
    avgCommute: number
    affordability: number
    amenities: number
    commuteExperience: number
  }
  avgCommuteMinutes: number
  maxCommuteMinutes: number
  rentRange: { min: number; max: number }
  label: string
  tags: string[]
}

interface MemberSummary {
  id: string
  name: string
  color: string
  location: { lat: number; lng: number }
}

interface AreaDetail {
  areaId: string
  areaName: string
  district: string
  center: { lat: number; lng: number }
  rentAnalysis: {
    avgSingleRoom: number
    cityAvg: number
    trend: string
  }
  amenities: {
    metroStations: number
    metroLines: string[]
    shoppingMalls: number
    restaurants: number
    parks: number
    hospitals: number
  }
  commuteRoutes: Array<{
    memberStationId: string
    minutes: number
    transfers: number
    route: Array<{ station: string; line: string }>
  }>
}

interface AppState {
  members: MemberLocation[]
  recommendations: RecommendArea[]
  membersSummary: MemberSummary[]
  selectedArea: AreaDetail | null
  loading: boolean
  addMember: () => void
  removeMember: (id: string) => void
  updateMember: (id: string, data: Partial<MemberLocation>) => void
  setRecommendations: (data: RecommendArea[], summaries: MemberSummary[]) => void
  setSelectedArea: (area: AreaDetail | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  members: [
    { id: '1', name: '', placeName: '', stationId: '', lat: 0, lng: 0, minRent: 0, maxRent: 5000, minCommuteMinutes: 10, maxCommuteMinutes: 60 },
    { id: '2', name: '', placeName: '', stationId: '', lat: 0, lng: 0, minRent: 0, maxRent: 5000, minCommuteMinutes: 10, maxCommuteMinutes: 60 },
  ],
  recommendations: [],
  membersSummary: [],
  selectedArea: null,
  loading: false,
  addMember: () =>
    set((state) => ({
      members: [
        ...state.members,
        {
          id: String(Date.now()),
          name: '',
          placeName: '',
          stationId: '',
          lat: 0,
          lng: 0,
          minRent: 0,
          maxRent: 5000,
          minCommuteMinutes: 10,
          maxCommuteMinutes: 60,
        },
      ],
    })),
  removeMember: (id) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
    })),
  updateMember: (id, data) =>
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? { ...m, ...data } : m)),
    })),
  setRecommendations: (data, summaries) =>
    set({ recommendations: data, membersSummary: summaries }),
  setSelectedArea: (area) => set({ selectedArea: area }),
  setLoading: (loading) => set({ loading }),
  reset: () =>
    set({
      recommendations: [],
      membersSummary: [],
      selectedArea: null,
    }),
}))
