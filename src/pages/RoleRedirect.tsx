import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function RoleRedirect() {
  const { user, loading } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (!user) { setChecking(false); return }
      const { data } = await supabase.from('profiles').select('user_role').eq('id', user.id).single()
      setRole(data?.user_role ?? null)
      setChecking(false)
    }
    run()
  }, [user])

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (role === 'super_admin') return <Navigate to="/super-admin" replace />
  if (role === 'location_owner') return <Navigate to="/owner" replace />
  return <Navigate to="/dashboard" replace />
}
