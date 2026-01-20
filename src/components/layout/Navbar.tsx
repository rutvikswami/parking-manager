import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'user' | 'location_owner' | 'super_admin' | null>(null)

  useEffect(() => {
    if (user) {
      checkAdminStatus()
    }
  }, [user])

  const checkAdminStatus = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()
      if (error) throw error
      setRole((data?.user_role as any) ?? 'user')
    } catch (error) {
      // Error checking admin status
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white shadow-sm border-b sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">ParkScope</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Link to="/map">
                  <Button variant="ghost">Map</Button>
                </Link>
                {role === 'location_owner' && (
                  <Link to="/owner">
                    <Button variant="ghost">
                      <Settings className="h-4 w-4 mr-2" />
                      Owner Dashboard
                    </Button>
                  </Link>
                )}
                {role === 'super_admin' && (
                  <Link to="/super-admin">
                    <Button variant="ghost">
                      <Settings className="h-4 w-4 mr-2" />
                      Super Admin
                    </Button>
                  </Link>
                )}
                <Link to="/profile">
                  <Button variant="ghost" size="icon">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/register">
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}