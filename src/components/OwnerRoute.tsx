import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function OwnerRoute({ children }: { children: React.ReactNode }) {
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
  if (role !== 'location_owner' && role !== 'super_admin') return <Navigate to="/" replace />

  return <>{children}</>
}
