'use client'

import { useEffect, useState } from 'react'
import SlideMenu from '@/components/layout/SlideMenu'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userData, setUserData] = useState<{
    userName: string
    userEmail: string
    avatarUrl?: string
  } | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')

      if (!userStr || !token) return

      const user = JSON.parse(userStr)

      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=full_name,avatar_url`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            }
          }
        )

        if (res.ok) {
          const profiles = await res.json()
          if (profiles.length > 0) {
            setUserData({
              userName: profiles[0].full_name || 'Usuario',
              userEmail: user.email || '',
              avatarUrl: profiles[0].avatar_url
            })
            return
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err)
      }

      setUserData({
        userName: 'Usuario',
        userEmail: user.email || ''
      })
    }

    loadUserData()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950">
      {userData && (
        <SlideMenu
          userType="creator"
          userName={userData.userName}
          userEmail={userData.userEmail}
          avatarUrl={userData.avatarUrl}
        />
      )}
      <main className="pl-0 lg:pl-0">
        {children}
      </main>
    </div>
  )
}
