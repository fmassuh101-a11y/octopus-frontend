'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'
const ADMIN_EMAIL = 'fmassuh133@gmail.com'

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  fee: number
  net_amount: number
  method: string
  status: string
  payment_details: any
  admin_notes: string | null
  created_at: string
  user_email?: string
  user_name?: string
}

interface Stats {
  totalUsers: number
  totalCreators: number
  totalCompanies: number
  totalGigs: number
  pendingWithdrawals: number
  totalPendingAmount: number
}

interface User {
  user_id: string
  full_name: string
  user_type: 'creator' | 'company'
  email?: string
  wallet?: {
    id: string
    balance: number
    pending_balance: number
    total_earned: number
    total_withdrawn: number
  }
}

// Gigs Management Component
function GigsManagement() {
  const [gigs, setGigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getToken = () => localStorage.getItem('sb-access-token')

  useEffect(() => {
    loadGigs()
  }, [])

  const loadGigs = async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/gigs?select=*&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const data = res.ok ? await res.json() : []

      // Get company names
      const companyIds = Array.from(new Set<string>(data.map((g: any) => g.company_id).filter(Boolean)))
      if (companyIds.length > 0) {
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${companyIds.join(',')})&select=user_id,full_name`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const profiles = profilesRes.ok ? await profilesRes.json() : []
        const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]))

        const enrichedGigs = data.map((g: any) => ({
          ...g,
          company_name: profileMap.get(g.company_id) || 'Unknown'
        }))
        setGigs(enrichedGigs)
      } else {
        setGigs(data)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading gigs:', err)
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar el gig "${title}"? Esta acción no se puede deshacer.`)) return

    setDeletingId(id)
    const token = getToken()

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gigs?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        }
      })

      if (res.ok) {
        setGigs(prev => prev.filter(g => g.id !== id))
        alert('✅ Gig eliminado')
      } else {
        const errorText = await res.text()
        console.error('Delete error:', res.status, errorText)
        alert('Error al eliminar el gig')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar')
    }
    setDeletingId(null)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Gigs</h2>
          <p className="text-neutral-400">Ver y eliminar gigs de la plataforma</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500">Total Gigs</p>
          <p className="text-2xl font-bold">{gigs.length}</p>
        </div>
      </div>

      {gigs.length === 0 ? (
        <div className="bg-neutral-900 rounded-2xl p-12 text-center border border-neutral-800">
          <span className="text-4xl mb-4 block">📭</span>
          <h3 className="text-xl font-semibold mb-2">No hay gigs</h3>
          <p className="text-neutral-500">Aún no se han creado gigs en la plataforma</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {gigs.map((gig) => (
            <div
              key={gig.id}
              className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{gig.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      gig.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      gig.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-neutral-500/20 text-neutral-400'
                    }`}>
                      {gig.status || 'active'}
                    </span>
                  </div>

                  <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
                    {gig.description || 'Sin descripción'}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">🏢</span>
                      <span>{gig.company_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">💰</span>
                      <span className="text-green-400 font-semibold">${gig.budget || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">📅</span>
                      <span>{formatDate(gig.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">📁</span>
                      <span>{gig.category || 'Sin categoría'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`/gigs/${gig.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-sky-500/20 text-sky-400 rounded-xl text-sm font-medium hover:bg-sky-500/30 transition-colors text-center"
                  >
                    👁️ Ver
                  </a>
                  <button
                    onClick={() => handleDelete(gig.id, gig.title)}
                    disabled={deletingId === gig.id}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {deletingId === gig.id ? '...' : '🗑️ Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Users Management Component
function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'creator' | 'company'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [addMoneyAmount, setAddMoneyAmount] = useState('')
  const [addMoneyNote, setAddMoneyNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const getToken = () => localStorage.getItem('sb-access-token')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    const token = getToken()
    if (!token) return

    try {
      // Get all profiles
      const profilesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=user_id,full_name,user_type&order=full_name.asc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const profiles = profilesRes.ok ? await profilesRes.json() : []

      // Get all wallets
      const walletsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const wallets = walletsRes.ok ? await walletsRes.json() : []
      const walletMap = new Map(wallets.map((w: any) => [w.user_id, w]))

      // Merge data
      const usersWithWallets = profiles.map((p: any) => ({
        ...p,
        wallet: walletMap.get(p.user_id) || null
      }))

      setUsers(usersWithWallets)
      setLoading(false)
    } catch (err) {
      console.error('Error loading users:', err)
      setLoading(false)
    }
  }

  const handleAddMoney = async () => {
    if (!selectedUser || !addMoneyAmount || parseFloat(addMoneyAmount) <= 0) {
      alert('Por favor ingresa un monto válido')
      return
    }

    setProcessing(true)
    const token = getToken()
    const amount = parseFloat(addMoneyAmount)

    try {
      // Check if user has a wallet
      if (selectedUser.wallet) {
        // Update existing wallet
        const newBalance = (selectedUser.wallet.balance || 0) + amount
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${selectedUser.user_id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
          }
        )

        if (!res.ok) {
          const errorText = await res.text()
          console.error('Wallet update error:', res.status, errorText)
          throw new Error(`Failed to update wallet: ${res.status}`)
        }

        // Create transaction record
        await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            wallet_id: selectedUser.wallet.id,
            type: 'bonus',
            amount: amount,
            fee: 0,
            net_amount: amount,
            status: 'completed',
            description: addMoneyNote || 'Admin: Fondos agregados para pruebas',
            metadata: { added_by: 'admin', reason: 'testing' }
          })
        })

      } else {
        // Create new wallet with initial balance
        const walletRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: selectedUser.user_id,
            user_type: selectedUser.user_type,
            balance: amount,
            pending_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            currency: 'USD'
          })
        })

        if (!walletRes.ok) {
          const errorText = await walletRes.text()
          console.error('Wallet create error:', walletRes.status, errorText)
          throw new Error(`Failed to create wallet: ${walletRes.status}`)
        }

        const newWallet = await walletRes.json()

        // Create transaction record
        await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            wallet_id: newWallet[0].id,
            type: 'bonus',
            amount: amount,
            fee: 0,
            net_amount: amount,
            status: 'completed',
            description: addMoneyNote || 'Admin: Fondos agregados para pruebas',
            metadata: { added_by: 'admin', reason: 'testing' }
          })
        })
      }

      alert(`✅ $${amount} agregados a la cuenta de ${selectedUser.full_name}`)
      setSelectedUser(null)
      setAddMoneyAmount('')
      setAddMoneyNote('')
      await loadUsers() // Reload to see updated balances
    } catch (err) {
      console.error('Error adding money:', err)
      alert('Error al agregar fondos')
    }
    setProcessing(false)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || user.user_type === filterType
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
          <p className="text-neutral-400">Ver usuarios y agregar fondos para pruebas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 pl-10 text-sm focus:outline-none focus:border-sky-500 w-64"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">🔍</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-sky-500"
          >
            <option value="all">Todos</option>
            <option value="creator">Creadores</option>
            <option value="company">Empresas</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Usuario</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Tipo</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Balance</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Total Ganado</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Total Retirado</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        user.user_type === 'creator'
                          ? 'bg-gradient-to-br from-violet-500 to-purple-500'
                          : 'bg-gradient-to-br from-emerald-500 to-green-500'
                      }`}>
                        {user.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-neutral-500 truncate max-w-[200px]">{user.user_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.user_type === 'creator'
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {user.user_type === 'creator' ? '🎨 Creador' : '🏢 Empresa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-green-400">
                      ${user.wallet?.balance?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-400">
                    ${user.wallet?.total_earned?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-400">
                    ${user.wallet?.total_withdrawn?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-4 py-2 bg-sky-500/20 text-sky-400 rounded-xl text-sm font-medium hover:bg-sky-500/30 transition-colors"
                    >
                      💰 Agregar Fondos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-neutral-500">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Add Money Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-neutral-900 rounded-2xl p-6 w-full max-w-md border border-neutral-800 shadow-2xl">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-4 ${
                selectedUser.user_type === 'creator'
                  ? 'bg-gradient-to-br from-violet-500 to-purple-500'
                  : 'bg-gradient-to-br from-emerald-500 to-green-500'
              }`}>
                {selectedUser.full_name?.charAt(0) || '?'}
              </div>
              <h3 className="text-xl font-bold">{selectedUser.full_name}</h3>
              <p className="text-sm text-neutral-500">
                {selectedUser.user_type === 'creator' ? 'Creador' : 'Empresa'}
              </p>
              <p className="text-sm text-neutral-400 mt-2">
                Balance actual: <span className="text-green-400 font-semibold">${selectedUser.wallet?.balance?.toFixed(2) || '0.00'}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Monto a agregar (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 pl-8 text-lg font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  value={addMoneyNote}
                  onChange={(e) => setAddMoneyNote(e.target.value)}
                  placeholder="Ej: Fondos de prueba..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-3 bg-neutral-800 rounded-xl font-medium hover:bg-neutral-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMoney}
                  disabled={processing || !addMoneyAmount || parseFloat(addMoneyAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>💰 Agregar Fondos</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'withdrawals' | 'users' | 'gigs'>('overview')
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCreators: 0,
    totalCompanies: 0,
    totalGigs: 0,
    pendingWithdrawals: 0,
    totalPendingAmount: 0
  })
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const getToken = () => localStorage.getItem('sb-access-token')

  const checkAdminAccess = async () => {
    try {
      const userStr = localStorage.getItem('sb-user')
      if (!userStr) {
        window.location.href = '/auth/login'
        return
      }

      const user = JSON.parse(userStr)

      // Check if user email matches admin email
      if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        alert('Acceso denegado. Solo administradores.')
        window.location.href = '/'
        return
      }

      setIsAdmin(true)
      await loadDashboardData()
    } catch (err) {
      console.error('Admin check error:', err)
      window.location.href = '/'
    }
  }

  const loadDashboardData = async () => {
    const token = getToken()
    if (!token) return

    try {
      console.log('[Admin] Loading dashboard data...')

      // Load stats
      const [usersRes, gigsRes, withdrawalsRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=user_type`, {
          headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
        }),
        fetch(`${SUPABASE_URL}/rest/v1/gigs?select=id`, {
          headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
        }),
        fetch(`${SUPABASE_URL}/rest/v1/withdrawal_requests?select=*&order=created_at.desc`, {
          headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
        })
      ])

      console.log('[Admin] Withdrawals response status:', withdrawalsRes.status)

      const users = usersRes.ok ? await usersRes.json() : []
      const gigs = gigsRes.ok ? await gigsRes.json() : []
      const allWithdrawals = withdrawalsRes.ok ? await withdrawalsRes.json() : []

      console.log('[Admin] All withdrawals from DB:', allWithdrawals)
      console.log('[Admin] Withdrawals count:', allWithdrawals.length)

      const creators = users.filter((u: any) => u.user_type === 'creator').length
      const companies = users.filter((u: any) => u.user_type === 'company').length
      // Filter only pending withdrawals
      const onlyPending = allWithdrawals.filter((w: any) => w.status === 'pending')
      console.log('[Admin] Pending withdrawals:', onlyPending.length, onlyPending)
      const totalPending = onlyPending.reduce((sum: number, w: any) => sum + (w.amount || 0), 0)

      setStats({
        totalUsers: users.length,
        totalCreators: creators,
        totalCompanies: companies,
        totalGigs: gigs.length,
        pendingWithdrawals: onlyPending.length,
        totalPendingAmount: totalPending
      })

      // Load withdrawal details with user info
      if (onlyPending.length > 0) {
        const userIds = Array.from(new Set<string>(onlyPending.map((w: any) => w.user_id)))
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${userIds.join(',')})&select=user_id,full_name`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const profiles = profilesRes.ok ? await profilesRes.json() : []
        const profileMap = new Map<string, { user_id: string; full_name: string }>(profiles.map((p: any) => [p.user_id, p]))

        const enrichedWithdrawals = onlyPending.map((w: any) => ({
          ...w,
          user_name: profileMap.get(w.user_id)?.full_name || 'Usuario'
        }))
        setWithdrawals(enrichedWithdrawals)
      } else {
        setWithdrawals([])
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setLoading(false)
    }
  }

  const handleWithdrawalAction = async (id: string, action: 'approved' | 'rejected', notes?: string) => {
    setProcessingId(id)
    const token = getToken()
    const userStr = localStorage.getItem('sb-user')
    const user = userStr ? JSON.parse(userStr) : null

    const withdrawal = withdrawals.find(w => w.id === id)
    if (!withdrawal) {
      alert('No se encontró la solicitud')
      setProcessingId(null)
      return
    }

    try {
      // Update withdrawal request status
      const res = await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_requests?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: action,
          admin_notes: notes || (action === 'approved' ? 'Aprobado por admin' : 'Rechazado por admin'),
          processed_at: new Date().toISOString()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update withdrawal status')
      }

      // If rejected, return money to user's wallet
      if (action === 'rejected') {
        // Get user's wallet
        const walletRes = await fetch(
          `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${withdrawal.user_id}&select=*`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const wallets = walletRes.ok ? await walletRes.json() : []

        if (wallets.length > 0) {
          const wallet = wallets[0]
          // Return money to balance, remove from pending
          await fetch(`${SUPABASE_URL}/rest/v1/wallets?id=eq.${wallet.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              balance: (wallet.balance || 0) + withdrawal.amount,
              pending_balance: Math.max(0, (wallet.pending_balance || 0) - withdrawal.amount)
            })
          })
        }
      }

      // If approved, update wallet totals
      if (action === 'approved') {
        // Get user's wallet
        const walletRes = await fetch(
          `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${withdrawal.user_id}&select=*`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const wallets = walletRes.ok ? await walletRes.json() : []

        if (wallets.length > 0) {
          const wallet = wallets[0]
          // Move from pending to withdrawn
          await fetch(`${SUPABASE_URL}/rest/v1/wallets?id=eq.${wallet.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              pending_balance: Math.max(0, (wallet.pending_balance || 0) - withdrawal.amount),
              total_withdrawn: (wallet.total_withdrawn || 0) + withdrawal.net_amount
            })
          })
        }
      }

      setWithdrawals(prev => prev.filter(w => w.id !== id))
      setStats(prev => ({
        ...prev,
        pendingWithdrawals: prev.pendingWithdrawals - 1,
        totalPendingAmount: prev.totalPendingAmount - withdrawal.amount
      }))

      if (action === 'approved') {
        alert(`✅ Retiro aprobado!\n\nDEBES ENVIAR MANUALMENTE:\n$${withdrawal.net_amount} a ${withdrawal.user_name}\nMétodo: ${withdrawal.method}\nDetalles: ${JSON.stringify(withdrawal.payment_details)}`)
      } else {
        alert('❌ Retiro rechazado. El dinero fue devuelto al balance del usuario.')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al procesar')
    }
    setProcessingId(null)
  }

  const formatMethod = (method: string) => {
    const methods: Record<string, string> = {
      'bank_transfer': '🏦 Transferencia Bancaria',
      'paypal': '💳 PayPal',
      'crypto_usdt': '₿ USDT',
      'crypto_usdc': '💵 USDC'
    }
    return methods[method] || method
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Verificando acceso de admin...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">
                <span className="text-xl">🐙</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-neutral-400">{ADMIN_EMAIL}</p>
              </div>
            </div>
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors text-sm">
              ← Volver a la app
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'withdrawals', label: 'Retiros Pendientes', icon: '💸', badge: stats.pendingWithdrawals },
              { id: 'users', label: 'Usuarios', icon: '👥' },
              { id: 'gigs', label: 'Gigs', icon: '💼' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.icon} {tab.label}
                  {tab.badge ? (
                    <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {tab.badge}
                    </span>
                  ) : null}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Usuarios', value: stats.totalUsers, icon: '👥', color: 'from-blue-500 to-cyan-500' },
                { label: 'Creadores', value: stats.totalCreators, icon: '🎨', color: 'from-violet-500 to-purple-500' },
                { label: 'Empresas', value: stats.totalCompanies, icon: '🏢', color: 'from-emerald-500 to-green-500' },
                { label: 'Gigs Activos', value: stats.totalGigs, icon: '💼', color: 'from-orange-500 to-amber-500' },
              ].map((stat) => (
                <div key={stat.label} className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.color}`} />
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-neutral-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Pending Withdrawals Alert */}
            {stats.pendingWithdrawals > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-200">
                      {stats.pendingWithdrawals} Solicitudes de Retiro Pendientes
                    </h3>
                    <p className="text-sm text-amber-300/70">
                      Total: ${stats.totalPendingAmount.toLocaleString()} USD esperando aprobación
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="px-4 py-2 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors"
                  >
                    Ver Solicitudes
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('withdrawals')}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-left hover:border-neutral-700 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">💸</span>
                </div>
                <h3 className="font-semibold mb-1">Procesar Retiros</h3>
                <p className="text-sm text-neutral-500">Aprobar o rechazar solicitudes de pago</p>
              </button>

              <button className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-left hover:border-neutral-700 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="font-semibold mb-1">Verificar Creadores</h3>
                <p className="text-sm text-neutral-500">Revisar y aprobar perfiles de creadores</p>
              </button>

              <button className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-left hover:border-neutral-700 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🚫</span>
                </div>
                <h3 className="font-semibold mb-1">Moderar Contenido</h3>
                <p className="text-sm text-neutral-500">Revisar y eliminar contenido inapropiado</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Solicitudes de Retiro</h2>
                <p className="text-neutral-400">Aprueba los pagos y envíalos manualmente</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">Total Pendiente</p>
                <p className="text-2xl font-bold text-amber-400">${stats.totalPendingAmount.toLocaleString()}</p>
              </div>
            </div>

            {withdrawals.length === 0 ? (
              <div className="bg-neutral-900 rounded-2xl p-12 text-center border border-neutral-800">
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">No hay solicitudes pendientes</h3>
                <p className="text-neutral-500">Todas las solicitudes han sido procesadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center font-semibold">
                            {withdrawal.user_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold">{withdrawal.user_name}</p>
                            <p className="text-sm text-neutral-500">
                              {new Date(withdrawal.created_at).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-neutral-500">Monto</p>
                            <p className="font-semibold text-lg">${withdrawal.amount}</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Fee</p>
                            <p className="text-red-400">-${withdrawal.fee}</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Neto a pagar</p>
                            <p className="font-semibold text-green-400">${withdrawal.net_amount}</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Método</p>
                            <p>{formatMethod(withdrawal.method)}</p>
                          </div>
                        </div>

                        {/* Payment Details */}
                        <div className="mt-4 p-4 bg-neutral-800/50 rounded-xl">
                          <p className="text-sm text-neutral-400 mb-2">Detalles de pago:</p>
                          <pre className="text-sm text-neutral-300 whitespace-pre-wrap">
                            {JSON.stringify(withdrawal.payment_details, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:ml-4">
                        <button
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'approved')}
                          disabled={processingId === withdrawal.id}
                          className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {processingId === withdrawal.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>✅ Aprobar</>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Razón del rechazo (opcional):')
                            handleWithdrawalAction(withdrawal.id, 'rejected', reason || undefined)
                          }}
                          disabled={processingId === withdrawal.id}
                          className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <UsersManagement />
        )}

        {activeTab === 'gigs' && (
          <GigsManagement />
        )}
      </div>
    </div>
  )
}
