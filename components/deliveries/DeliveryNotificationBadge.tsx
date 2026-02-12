'use client'

import { useState, useEffect } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read_at?: string
  created_at: string
  delivery_id: string
}

interface DeliveryNotificationBadgeProps {
  userId: string
  userType: 'creator' | 'company'
}

const NOTIFICATION_ICONS: Record<string, string> = {
  content_submitted: '📤',
  content_approved: '✓',
  revision_requested: '↻',
  payment_released: '💰',
  delivery_completed: '🎉',
}

export default function DeliveryNotificationBadge({ userId, userType }: DeliveryNotificationBadgeProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_notifications?recipient_id=eq.${userId}&order=created_at.desc&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

      await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_notifications?id=eq.${notificationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            read_at: new Date().toISOString()
          })
        }
      )

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      )
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
    if (unreadIds.length === 0) return

    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

      await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_notifications?id=in.(${unreadIds.join(',')})`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            read_at: new Date().toISOString()
          })
        }
      )

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  const formatTime = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return notifDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id)
    }
    // Navigate based on user type
    const path = userType === 'creator' ? '/creator/deliveries' : '/company/review-content'
    window.location.href = path
    setShowDropdown(false)
  }

  if (loading) {
    return (
      <div className="relative">
        <button className="p-2 rounded-lg hover:bg-white/10">
          <span className="text-xl animate-pulse">🔔</span>
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">Notificaciones de Entregas</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Marcar todo leido
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-neutral-500 text-sm">Sin notificaciones</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full px-4 py-3 text-left hover:bg-neutral-800 transition-colors border-b border-neutral-800 last:border-0 ${
                      !notif.read_at ? 'bg-violet-500/5' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-xl flex-shrink-0">
                        {NOTIFICATION_ICONS[notif.type] || '📦'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-medium text-sm ${!notif.read_at ? 'text-white' : 'text-neutral-300'}`}>
                            {notif.title}
                          </p>
                          <span className="text-xs text-neutral-500 flex-shrink-0">
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-400 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read_at && (
                        <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-neutral-800">
                <a
                  href={userType === 'creator' ? '/creator/deliveries' : '/company/review-content'}
                  className="block text-center text-sm text-violet-400 hover:text-violet-300 font-medium"
                >
                  Ver todas las entregas
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
