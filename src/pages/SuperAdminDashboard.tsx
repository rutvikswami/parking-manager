import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Trash2, MapPin, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { AdminRequestsPanel } from '@/components/admin/AdminRequestsPanel'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface OwnerWithStats extends Profile {
  location_count: number
  locations?: Array<{ id: string; name: string }>
}

export function SuperAdminDashboard() {
  const { user } = useAuth()
  const [view, setView] = useState<'locations' | 'owners' | 'requests'>('locations')
  const [owners, setOwners] = useState<OwnerWithStats[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    owner: OwnerWithStats | null
  }>({
    open: false,
    owner: null
  })

  const fetchOwners = async () => {
    setLoading(true)
    try {
      // Get all location owners
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_role', 'location_owner')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // For each owner, count their locations
      const ownersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: locations, error } = await supabase
            .from('parking_locations')
            .select('id, name')
            .eq('owner_user_id', profile.id)

          return {
            ...profile,
            location_count: locations?.length || 0,
            locations: locations || []
          }
        })
      )

      setOwners(ownersWithStats)
    } catch (error) {
      // Error fetching owners
      toast.error('Failed to load owners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'owners') {
      fetchOwners()
    }
  }, [view])

  const handleDeleteOwner = async () => {
    if (!deleteDialog.owner) return

    try {
      const ownerId = deleteDialog.owner.id

      // Step 1: Delete all zones for this owner's locations (cascade handled by DB)
      // Step 2: Delete all locations owned by this user
      const { error: locationsError } = await supabase
        .from('parking_locations')
        .delete()
        .eq('owner_user_id', ownerId)

      if (locationsError) throw locationsError

      // Step 3: Downgrade user role to 'user' instead of deleting the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_role: 'user', updated_at: new Date().toISOString() })
        .eq('id', ownerId)

      if (profileError) throw profileError

      toast.success(`Owner removed successfully! ${deleteDialog.owner.location_count} location(s) and all zones deleted.`)
      
      setDeleteDialog({ open: false, owner: null })
      await fetchOwners()
    } catch (error) {
      // Error deleting owner
      toast.error(`Failed to delete owner: ${error.message}`)
    }
  }

  if (view === 'locations') {
    return (
      <div>
        <div className="mb-6 flex space-x-2">
          <Button onClick={() => setView('locations')} variant="default">
            Locations
          </Button>
          <Button onClick={() => setView('owners')} variant="outline">
            Manage Owners
          </Button>
          <Button onClick={() => setView('requests')} variant="outline">
            Requests
          </Button>
        </div>
        <AdminDashboard />
      </div>
    )
  }

  if (view === 'requests') {
    return (
      <div>
        <div className="mb-6 flex space-x-2">
          <Button onClick={() => setView('locations')} variant="outline">
            Locations
          </Button>
          <Button onClick={() => setView('owners')} variant="outline">
            Manage Owners
          </Button>
          <Button onClick={() => setView('requests')} variant="default">
            Requests
          </Button>
        </div>
        <AdminRequestsPanel />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex space-x-2">
        <Button onClick={() => setView('locations')} variant="outline">
          Locations
        </Button>
        <Button onClick={() => setView('owners')} variant="default">
          Manage Owners
        </Button>
        <Button onClick={() => setView('requests')} variant="outline">
          Requests
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Location Owners</h1>
            <p className="text-gray-600 mt-2">View and manage all location owners and their properties</p>
          </div>
          <Button onClick={fetchOwners} variant="outline">
            Refresh
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : owners.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Location Owners</h3>
            <p className="text-gray-500">No approved location owners found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {owners.map((owner, index) => (
            <motion.div
              key={owner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {owner.full_name || 'Unnamed Owner'}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{owner.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {owner.location_count} Location{owner.location_count !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, owner })}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Owner
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {owner.locations && owner.locations.length > 0 && (
                  <CardContent>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Owned Locations:</p>
                      <div className="space-y-1">
                        {owner.locations.map((location) => (
                          <div key={location.id} className="flex items-center text-sm text-gray-600 pl-4">
                            <MapPin className="h-3 w-3 mr-2" />
                            {location.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => 
        setDeleteDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Remove Location Owner
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 text-gray-700">
                <p>
                  Are you sure you want to remove <strong>{deleteDialog.owner?.full_name || 'this owner'}</strong> ({deleteDialog.owner?.email})?
                </p>
                <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                  <p className="font-semibold text-red-800">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Delete all {deleteDialog.owner?.location_count || 0} location(s) owned by this user</li>
                    <li>Delete all zones within those locations</li>
                    <li>Downgrade user role to regular user</li>
                    <li>Cannot be undone</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOwner}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Remove Owner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
