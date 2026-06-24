import { useRef, useState, useCallback } from 'react'
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '@/store/authStore'

export type ChatConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface MessageResponse {
  id: string
  conversationId: string
  senderId: string
  senderRole: 'OWNER' | 'STAFF' | 'SYSTEM'
  content: string
  sentAt: string
  isRead: boolean
}

export function useChatSocket() {
  const clientRef = useRef<Client | null>(null)
  const [status, setStatus] = useState<ChatConnectionStatus>('disconnected')

  const connect = useCallback(() => {
    if (clientRef.current?.active) return
    const token = useAuthStore.getState().accessToken
    if (!token) return

    setStatus('connecting')
    const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

    const client = new Client({
      webSocketFactory: () => new SockJS(`${apiBase}/ws`) as unknown as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => setStatus('connected'),
      onDisconnect: () => setStatus('disconnected'),
      onStompError: (frame) => {
        console.error('STOMP error:', frame)
        setStatus('disconnected')
      },
    })

    client.activate()
    clientRef.current = client
  }, [])

  const subscribe = useCallback(
    (conversationId: string, onMessage: (msg: MessageResponse) => void): (() => void) => {
      const client = clientRef.current
      if (!client?.connected) return () => {}

      const sub: StompSubscription = client.subscribe(
        `/topic/conversation/${conversationId}`,
        (frame: IMessage) => {
          try {
            onMessage(JSON.parse(frame.body) as MessageResponse)
          } catch (e) {
            console.error('Failed to parse STOMP message:', e)
          }
        }
      )
      return () => sub.unsubscribe()
    },
    []
  )

  const sendMessage = useCallback((conversationId: string, content: string): boolean => {
    const client = clientRef.current
    if (!client?.connected) return false
    client.publish({
      destination: `/app/chat/${conversationId}`,
      body: JSON.stringify({ content }),
    })
    return true
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current?.deactivate()
    clientRef.current = null
    setStatus('disconnected')
  }, [])

  return { status, connect, subscribe, sendMessage, disconnect }
}
