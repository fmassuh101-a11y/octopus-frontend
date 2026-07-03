'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getPlan, effectiveFee } from '@/lib/plans'
import { ROLES, PERMISSIONS, defaultPermsForRole } from '@/lib/permissions'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { Check, Banknote, BarChart3, Bell, Briefcase, Crown, Users, Video } from 'lucide-react'

type SettingsTab = 'payment' | 'paymentMethods' | 'profile' | 'team' | 'notifications'

export default function CompanySettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  // Profile form state
  const [companyName, setCompanyName] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  // Team members
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviting, setInviting] = useState(false)
  const [teamMsg, setTeamMsg] = useState('')

  const updateMemberRole = async (memberId: string, role: string) => {
    const token = localStorage.getItem('sb-access-token')
    const perms = defaultPermsForRole(role)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?id=eq.${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ role, permissions: perms }),
      })
      if (res.ok) setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role, permissions: perms } : m))
    } catch (e) { console.error(e) }
  }

  const toggleMemberPerm = async (member: any, permKey: string) => {
    const token = localStorage.getItem('sb-access-token')
    const current: string[] = Array.isArray(member.permissions) ? member.permissions : []
    const next = current.includes(permKey) ? current.filter(p => p !== permKey) : [...current, permKey]
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?id=eq.${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ role: 'custom', permissions: next }),
      })
      if (res.ok) setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: 'custom', permissions: next } : m))
    } catch (e) { console.error(e) }
  }

  const loadTeam = async (companyId: string, token: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?company_id=eq.${companyId}&select=*&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } })
      if (res.ok) setTeamMembers(await res.json())
    } catch (e) { console.error(e) }
  }

  const inviteMember = async () => {
    setTeamMsg('')
    const plan = getPlan(profile?.plan)
    const seats = plan.seats
    // el dueño cuenta como 1 asiento
    if (seats >= 0 && teamMembers.length + 1 >= seats) {
      setTeamMsg(`Tu plan ${plan.name} permite ${seats} ${seats === 1 ? 'asiento' : 'asientos'}. Mejora tu plan para invitar más.`)
      return
    }
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setTeamMsg('Ingresa un email válido.')
      return
    }
    setInviting(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY, 'Prefer': 'return=representation' },
        body: JSON.stringify({ company_id: user.id, email: inviteEmail.trim().toLowerCase(), role: inviteRole, permissions: defaultPermsForRole(inviteRole), status: 'invited' }),
      })
      if (!res.ok) throw new Error(await res.text())
      const created = await res.json()
      setTeamMembers(prev => [...(Array.isArray(created) ? created : [created]), ...prev])
      setInviteEmail('')
      setTeamMsg('✓ Invitación registrada.')
    } catch (e: any) { setTeamMsg('Error al invitar.') } finally { setInviting(false) }
  }

  // Notifications state
  const [notifications, setNotifications] = useState({
    allNotifications: true,
    emailNotifications: true,
    applicants: true,
    interviewReminders: true,
    paymentFailures: true,
    jobs: true,
    payouts: true,
    videoReviews: true,
    team: true,
    alerts: true,
    analytics: true,
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        router.push('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)
      setEmail(userData.email || '')

      // Try to fetch profile
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0) {
          const profileData = profiles[0]
          setProfile(profileData)
          loadTeam(userData.id, token)
          setCompanyName(profileData.full_name || '')
          setProfileImage(profileData.avatar_url || null)

          // Parse bio for additional data
          if (profileData.bio) {
            try {
              const bioData = JSON.parse(profileData.bio)
              if (bioData.companyName) setCompanyName(bioData.companyName)
              if (bioData.logo) setProfileImage(bioData.logo)
            } catch (e) {}
          }
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading profile:', error)
      setLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token || !profile) return

      // Get existing bio data
      let bioData = {}
      if (profile.bio) {
        try {
          bioData = JSON.parse(profile.bio)
        } catch (e) {}
      }

      // Update bio with new values
      const updatedBio = {
        ...bioData,
        companyName,
        logo: profileImage,
      }

      // Update profile in Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          full_name: companyName,
          avatar_url: profileImage,
          bio: JSON.stringify(updatedBio)
        })
      })

      if (response.ok) {
        alert('Perfil guardado correctamente')
      } else {
        alert('Error al guardar el perfil')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error al guardar el perfil')
    }
    setSaving(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Cargando configuracion...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'payment' as SettingsTab, label: 'Payment Plans' },
    { id: 'paymentMethods' as SettingsTab, label: 'Payment Methods' },
    { id: 'profile' as SettingsTab, label: 'Profile' },
    { id: 'team' as SettingsTab, label: 'Team Members' },
    { id: 'notifications' as SettingsTab, label: 'Notifications' },
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/company/dashboard" className="p-2 hover:bg-neutral-800 rounded-lg transition">
                <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-neutral-500">Manage your account and platform preferences</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Payment Plans Tab */}
        {activeTab === 'payment' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Planes</h2>
            <p className="text-neutral-500 mb-6">Mejora, cancela o renueva tu plan desde aquí</p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Plan */}
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 text-white placeholder-neutral-500">
                <h3 className="font-semibold text-white mb-4">Plan actual</h3>
                {profile?.plan_source === 'gifted' && (
                  <div className="mb-3 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    🎁 Te han regalado el plan {getPlan(profile?.plan).name}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="w-6 h-6 text-emerald-400" strokeWidth={2} />
                  <span className="font-medium text-white">{getPlan(profile?.plan).name}</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {getPlan(profile?.plan).monthly === null ? 'A medida' : `$${getPlan(profile?.plan).monthly}`}
                  {getPlan(profile?.plan).monthly !== null && <span className="text-base font-medium text-neutral-500">/mes</span>}
                </p>
                <p className="text-xs text-neutral-500 mb-4">
                  Comisión {effectiveFee(getPlan(profile?.plan), profile?.discount_percent || 0)}% al depositar
                  {(profile?.discount_percent || 0) > 0 && ` (con ${profile.discount_percent}% de descuento)`}
                </p>
                <Link
                  href="/company/pricing"
                  className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold text-sm transition-colors"
                >
                  Ver planes y mejorar
                </Link>
              </div>

              {/* Payment Method */}
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 text-white placeholder-neutral-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Payment Method</h3>
                  <button
                    disabled
                    className="px-4 py-2 border border-neutral-700 rounded-lg text-neutral-500 cursor-not-allowed"
                  >
                    Change
                  </button>
                </div>
                <p className="text-neutral-500">No payment method on file</p>
              </div>
            </div>

            {/* Tax Info */}
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mt-6 text-white placeholder-neutral-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Tax / VAT Information</h3>
                  <p className="text-neutral-500 text-sm">Add your tax ID for invoices</p>
                </div>
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Payment History */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-2">Payment history</h3>
              <p className="text-neutral-500 mb-4">View your payment history</p>

              <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden text-white placeholder-neutral-500">
                <table className="w-full">
                  <thead className="bg-neutral-950">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Payment Invoice</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Amount</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Delivery date</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Status</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                        No payment history yet
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Tab */}
        {activeTab === 'paymentMethods' && (
          <div>
            <div className="flex gap-4 mb-6">
              <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg font-medium text-white placeholder-neutral-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Subscriptions
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-500 text-white placeholder-neutral-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Pay-ins
              </button>
            </div>

            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 text-white placeholder-neutral-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">Subscription Payment Methods</h3>
                  <p className="text-neutral-500 text-sm">Keep cards on file for subscription billing via Stripe.</p>
                </div>
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <button className="flex items-center gap-2 text-neutral-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              <p className="text-neutral-500 text-sm mb-4">Saved methods are secured with Stripe and can be reused across your account.</p>

              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-center text-blue-700 mb-4">
                No payment methods yet. Add one to simplify future payments and manual bank disbursements.
              </div>

              <button
                disabled
                className="w-full py-3 border border-neutral-700 rounded-lg text-neutral-500 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add payment method (Coming Soon)
              </button>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Profile</h2>
            <p className="text-neutral-500 mb-6">Update your information here. This is how you will appear in chats and conversations.</p>

            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-6 text-white placeholder-neutral-500">
              <h3 className="font-semibold text-white mb-1">Company Account</h3>
              <p className="text-neutral-500 text-sm mb-6">Update how your company appears to creators and in conversations.</p>

              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-neutral-800 rounded-xl overflow-hidden flex items-center justify-center">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-neutral-500">
                      {companyName?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-white mb-2">Profile Picture</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
                    >
                      Upload Image
                    </button>
                    <button
                      onClick={() => setProfileImage(null)}
                      className="px-4 py-2 border border-neutral-700 rounded-lg font-medium hover:bg-neutral-950 transition text-white placeholder-neutral-500"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-neutral-500 text-sm mt-2">We support PNGs, JPGs and JPEGs under 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden bg-neutral-900 text-white placeholder-neutral-500"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label className="block font-medium text-white mb-2">Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full max-w-md px-4 py-3 border border-neutral-700 rounded-lg focus:outline-none bg-neutral-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name"
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block font-medium text-white mb-2">Email *</label>
                <div className="flex gap-3 max-w-md">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-950 text-white placeholder-neutral-500"
                    disabled
                  />
                  <button
                    disabled
                    className="px-4 py-2 border border-neutral-700 rounded-lg text-neutral-500 cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="block font-medium text-white mb-2">Password *</label>
                <div className="flex gap-3 max-w-md">
                  <input
                    type="password"
                    value="••••••••••••"
                    className="flex-1 px-4 py-3 border border-neutral-700 rounded-lg bg-neutral-950 text-white placeholder-neutral-500"
                    disabled
                  />
                  <button
                    disabled
                    className="px-4 py-2 border border-neutral-700 rounded-lg text-neutral-500 cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full max-w-md py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* Team Members Tab */}
        {activeTab === 'team' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Miembros del equipo</h2>
              <p className="text-neutral-500">
                Tu plan <span className="text-emerald-400 font-medium">{getPlan(profile?.plan).name}</span> permite{' '}
                {getPlan(profile?.plan).seats < 0 ? 'asientos ilimitados' : `${getPlan(profile?.plan).seats} ${getPlan(profile?.plan).seats === 1 ? 'asiento' : 'asientos'}`}
                {' '}(incluyéndote). Usados: {teamMembers.length + 1}.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@delcolaborador.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-white outline-none focus:border-emerald-500"
              >
                {ROLES.filter(r => r.key !== 'custom').map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
              <button
                onClick={inviteMember}
                disabled={inviting}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 rounded-xl font-semibold text-sm text-white transition-colors whitespace-nowrap"
              >
                {inviting ? 'Invitando...' : 'Invitar'}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-4">{ROLES.find(r => r.key === inviteRole)?.desc}</p>
            {teamMsg && <p className={`text-sm mb-4 ${teamMsg.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>{teamMsg}</p>}

            {teamMembers.length > 0 && (
              <div className="space-y-3 mb-4">
                {teamMembers.map(m => (
                  <div key={m.id} className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-white font-medium">{m.email}</p>
                        <span className="text-xs text-neutral-500">{m.status === 'invited' ? 'Invitado · pendiente' : 'Miembro activo'}</span>
                      </div>
                      <select
                        value={m.role || 'editor'}
                        onChange={e => updateMemberRole(m.id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-white text-sm outline-none focus:border-emerald-500"
                      >
                        {ROLES.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
                      </select>
                    </div>
                    {/* Permisos granulares */}
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-3 border-t border-neutral-800">
                      {PERMISSIONS.map(p => {
                        const on = Array.isArray(m.permissions) && m.permissions.includes(p.key)
                        return (
                          <button
                            key={p.key}
                            onClick={() => toggleMemberPerm(m, p.key)}
                            className="flex items-center gap-2 text-left text-xs py-0.5"
                          >
                            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${on ? 'bg-emerald-500' : 'bg-neutral-800 border border-neutral-700'}`}>
                              {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </span>
                            <span className={on ? 'text-neutral-200' : 'text-neutral-500'}>{p.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 text-white placeholder-neutral-500">
              <h3 className="font-semibold text-white mb-4">Team Members</h3>

              <div className="flex items-center justify-between py-4 border-b border-neutral-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-800 rounded-full overflow-hidden flex items-center justify-center">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-neutral-500">
                        {companyName?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{companyName || 'Company'}</p>
                    <p className="text-neutral-500 text-sm">@{companyName?.toLowerCase().replace(/\s/g, '') || 'company'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-neutral-500">{email}</p>
                  <div className="flex flex-col gap-1">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Admin</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Full platform access</span>
                  </div>
                  <button className="text-neutral-500 hover:text-neutral-200">
                    Manage Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Notification Preferences</h2>
            <p className="text-neutral-500 mb-6">Choose how you'd like to receive notifications for different types of updates</p>

            {/* Notification Preferences Table */}
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden mb-8 text-white placeholder-neutral-500">
              <table className="w-full">
                <thead className="bg-neutral-950">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Notification type</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">SMS</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-neutral-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        All notifications
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.allNotifications}
                        onChange={(val) => setNotifications({...notifications, allNotifications: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.emailNotifications}
                        onChange={(val) => setNotifications({...notifications, emailNotifications: val})}
                      />
                    </td>
                  </tr>
                  <tr className="border-t border-neutral-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Applicants
                      </div>
                      <p className="text-neutral-500 text-sm ml-8">Get updates when new applications are submitted.</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.applicants}
                        onChange={(val) => setNotifications({...notifications, applicants: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch enabled={true} onChange={() => {}} />
                    </td>
                  </tr>
                  <tr className="border-t border-neutral-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Interview Reminders
                      </div>
                      <p className="text-neutral-500 text-sm ml-8">Stay on track with reminders before upcoming interviews.</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.interviewReminders}
                        onChange={(val) => setNotifications({...notifications, interviewReminders: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch enabled={true} onChange={() => {}} />
                    </td>
                  </tr>
                  <tr className="border-t border-neutral-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Payment Failures
                      </div>
                      <p className="text-neutral-500 text-sm ml-8">Get alerts when payments fail due to insufficient funds.</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.paymentFailures}
                        onChange={(val) => setNotifications({...notifications, paymentFailures: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch enabled={true} onChange={() => {}} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* In-App Notifications */}
            <h3 className="text-lg font-semibold text-white mb-2">In-App Notifications</h3>
            <p className="text-neutral-500 mb-4">Choose which notifications appear in your notification center</p>

            <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden text-white placeholder-neutral-500">
              <table className="w-full">
                <thead className="bg-neutral-950">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Category</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-neutral-500">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'jobs', icon: Briefcase, label: 'Jobs', desc: 'Job applicant milestones (100, 500, 1000 applicants)' },
                    { key: 'payouts', icon: Banknote, label: 'Payouts', desc: 'Balance alerts, payment due reminders, and payout status' },
                    { key: 'videoReviews', icon: Video, label: 'Video Reviews', desc: 'Notifications when videos are pending review' },
                    { key: 'team', icon: Users, label: 'Team', desc: 'Team member joins, contracts, and collaborations' },
                    { key: 'alerts', icon: Bell, label: 'Alerts', desc: 'System alerts, new features, and announcements' },
                    { key: 'analytics', icon: BarChart3, label: 'Analytics', desc: 'Video view milestones (10K, 100K, 1M views)' },
                  ].map((item) => (
                    <tr key={item.key} className="border-t border-neutral-800">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" strokeWidth={2} />
                          <div>
                            <p className="font-medium text-white">{item.label}</p>
                            <p className="text-neutral-500 text-sm">{item.desc}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ToggleSwitch
                          enabled={(notifications as any)[item.key]}
                          onChange={(val) => setNotifications({...notifications, [item.key]: val})}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Toggle Switch Component
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-neutral-800'
      } text-white placeholder-neutral-500`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-neutral-900 transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        } text-white placeholder-neutral-500`}
      />
    </button>
  )
}
