import { create } from 'zustand'

interface ChatWindow {
  conversationId: string
  bookingId: string
}

interface HotelStore {
  selectedHotelId: string | null
  setSelectedHotelId: (id: string | null) => void
  openChatWindows: ChatWindow[]
  openChatWindow: (convId: string, bookingId: string) => void
  closeChatWindow: (convId: string) => void
}

export const useHotelStore = create<HotelStore>((set) => ({
  selectedHotelId: null,
  setSelectedHotelId: (id) => set({ selectedHotelId: id }),
  openChatWindows: [],
  openChatWindow: (convId, bookingId) => set((state) => {
    // If already open, do nothing
    if (state.openChatWindows.some(w => w.conversationId === convId)) return {}
    // Max 3 windows, remove oldest if exceeded
    const next = [...state.openChatWindows, { conversationId: convId, bookingId }]
    if (next.length > 3) {
      next.shift()
    }
    return { openChatWindows: next }
  }),
  closeChatWindow: (convId) => set((state) => ({
    openChatWindows: state.openChatWindows.filter(w => w.conversationId !== convId)
  }))
}))
