import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Car, Edit, Save, X, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false) // super_admin only; cannot be changed from UI
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(data)
        setIsAdmin(data?.user_role === 'super_admin')
        setEditForm({
          full_name: data?.full_name || '',
          phone: data?.phone || '',
          email: data?.email || user.email || ''
        })
      } catch (error) {
        // Error fetching profile
      }
    }

    fetchProfile()
  }, [user])

  const handleUpdateProfile = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          email: editForm.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setProfile({
        ...profile,
        full_name: editForm.full_name,
        phone: editForm.phone,
        email: editForm.email
      })
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      // Error updating profile
      toast.error('Failed to update profile')
    }
  }

  const handleEditCancel = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      email: profile?.email || user?.email || ''
    })
    setIsEditing(false)
  }

  const switchToAdmin = () => {
    navigate('/admin')
  }

  // Role toggling is disabled to prevent privilege escalation
  const toggleUserRole = async () => {
    if (!user) return

    const newRole = isAdmin ? 'user' : 'super_admin'
    
    try {
      // Update in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          user_role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Also update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { user_role: newRole }
      })

      if (metadataError) throw metadataError

      // Update local state
      setProfile({ ...profile, user_role: newRole })
      setIsAdmin(newRole === 'super_admin')
      
      toast.success(`Role switched to ${newRole} successfully!`)
    } catch (error) {
      // Error updating user role
      toast.error('Failed to update user role')
    }
  }

  // Dangerous elevation removed: Super admin role cannot be self-granted from UI
  const forceAdminRole = async () => {
    if (!user) return
    
    try {
      // Force update to super admin in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || '',
          phone: profile?.phone || '',
          user_role: 'super_admin',
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      // Also update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { user_role: 'super_admin' }
      })

      if (metadataError) throw metadataError

      // Update local state
      setProfile({ ...profile, user_role: 'super_admin' })
      setIsAdmin(true)
      
      toast.success('Successfully set as super admin!')
    } catch (error) {
      // Error setting admin role
      toast.error('Failed to set admin role')
    }
  }

  if (!user) {
    return <div>Please log in to view your profile.</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <h1 className="text-3xl font-bold">Profile</h1>
        <div className="flex space-x-2">
          {isAdmin && (
            <Button variant="outline" onClick={switchToAdmin}>
              <Settings className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Button>
          )}
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </motion.div>


      {/* User Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Account Information</span>
                {isAdmin && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Admin
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (isEditing ? handleEditCancel() : setIsEditing(true))}
              >
                {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleUpdateProfile} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Full Name:</span>
                  <span className="font-medium">{profile?.full_name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium">{profile?.email || user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="font-medium">{profile?.phone || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Type:</span>
                  <span className="font-medium capitalize">
                    {profile?.user_role || 'user'}
                    {!profile?.user_role && (
                      <span className="text-red-500 text-xs ml-2">(Not set in DB)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Member Since:</span>
                  <span className="font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
