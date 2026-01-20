import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, MapPin, Car, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { SimpleLocationPicker } from '@/components/SimpleLocationPicker'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/supabase'

type ParkingLocation = Database['public']['Tables']['parking_locations']['Row']
type ParkingZone = Database['public']['Tables']['parking_zones']['Row']

interface LocationWithZones extends ParkingLocation {
  zones: ParkingZone[]
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [locations, setLocations] = useState<LocationWithZones[]>([])
  const [loading, setLoading] = useState(true)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [editingZone, setEditingZone] = useState<{ locationId: string; zone?: ParkingZone } | null>(null)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    lat: 0,
    lng: 0
  })

  const [zoneForm, setZoneForm] = useState({
    name: '',
    zone_number: 1,
    cost_per_hour: 15.00,
    total_slots: 50,
    lat: 0 as number,
    lng: 0 as number,
  })

  const [userRole, setUserRole] = useState<'user' | 'location_owner' | 'super_admin' | null>(null)

  // Fetch admin's locations function
  const fetchAdminLocations = async () => {
    if (!user) return

    try {
      // First check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()

      if (!profile || (profile.user_role !== 'location_owner' && profile.user_role !== 'super_admin')) {
        toast.error('Access denied: Admin privileges required')
        return
      }

      setUserRole(profile.user_role)

      // Fetch locations: super_admin sees all, owners see theirs
      const baseQuery = supabase
        .from('parking_locations')
        .select('*')
        .order('name')

      const { data: locationsData, error: locationsError } = await (
        profile.user_role === 'super_admin' ? baseQuery : baseQuery.eq('owner_user_id', user.id)
      )

      if (locationsError) throw locationsError

      if (!locationsData) {
        setLocations([])
        return
      }

      // Fetch zones for each location
      const locationsWithZones = await Promise.all(
        locationsData.map(async (location) => {
          const { data: zones, error: zonesError } = await supabase
            .from('parking_zones')
            .select('*')
            .eq('location_id', location.id)
            .order('zone_number')

          if (zonesError) {
            return {
              ...location,
              zones: []
            }
          }

          return {
            ...location,
            zones: zones || []
          }
        })
      )

      setLocations(locationsWithZones)
    } catch (error) {
      toast.error('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  // Refresh locations function
  const refreshLocations = async () => {
    await fetchAdminLocations()
  }

  // Initial load
  useEffect(() => {
    fetchAdminLocations()
  }, [user])


  const handleEditLocation = (location: LocationWithZones) => {
    setEditingLocationId(location.id)
    setLocationForm({
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng
    })
  }

  const handleUpdateLocation = async () => {
    if (!editingLocationId || !user) return

    try {
      const { error } = await supabase
        .from('parking_locations')
        .update({
          name: locationForm.name,
          address: locationForm.address,
          lat: locationForm.lat,
          lng: locationForm.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingLocationId)
        // Allow super admin to update any location; owners can update theirs
        // Additional filtering enforced by RLS policies


      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('A location with this name and coordinates already exists')
        }
        throw error
      }

      toast.success('Location updated successfully!')
      setEditingLocationId(null)
      setLocationForm({ name: '', address: '', lat: 0, lng: 0 })
      
      // Refresh locations
      await refreshLocations()
    } catch (error) {
      toast.error(`Failed to update location: ${error.message}`)
    }
  }

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: 'location' | 'zone'
    id: string
    name: string
  }>({
    open: false,
    type: 'location',
    id: '',
    name: ''
  })

  const handleDeleteLocation = async (locationId: string, locationName: string) => {
    setDeleteDialog({
      open: true,
      type: 'location',
      id: locationId,
      name: locationName
    })
  }

  const confirmDelete = async () => {
    if (!user || !deleteDialog.id) return

    try {
      
      if (deleteDialog.type === 'location') {
        const { error } = await supabase
          .from('parking_locations')
          .delete()
          .eq('id', deleteDialog.id)
          // Owners can delete their own; super admin can delete any (RLS enforces as well)

        if (error) {
  
          throw error
        }
        
        toast.success('Location and all zones deleted successfully!')
      } else {
        // Zone deletion with verification
        
        // Zone deletion
        const { error } = await supabase
          .from('parking_zones')
          .delete()
          .eq('id', deleteDialog.id)

        if (error) throw error
        
        toast.success('Zone deleted successfully!')
      }
      
      setDeleteDialog({ open: false, type: 'location', id: '', name: '' })
      
      // Refresh locations to update the UI
      await refreshLocations()
    } catch (error) {
      toast.error(`Failed to delete ${deleteDialog.type}: ${error.message}`)
    }
  }

  const handleDeleteZone = async (zoneId: string, zoneName: string) => {
    setDeleteDialog({
      open: true,
      type: 'zone',
      id: zoneId,
      name: zoneName
    })
  }


  const handleEditZone = async (locationId: string, zone?: ParkingZone) => {
    setEditingZone({ locationId, zone })
    if (zone) {
      setZoneForm({
        name: zone.name,
        zone_number: zone.zone_number,
        cost_per_hour: zone.cost_per_hour,
        total_slots: zone.total_slots,
        lat: zone.lat,
        lng: zone.lng,
      })
    } else {
      // Auto-increment zone number based on existing zones
      try {
        const { data: existingZones } = await supabase
          .from('parking_zones')
          .select('zone_number')
          .eq('location_id', locationId)
          .order('zone_number', { ascending: false })
          .limit(1)
        
        const nextZoneNumber = existingZones && existingZones.length > 0 
          ? existingZones[0].zone_number + 1 
          : 1
        
        const loc = locations.find(l => l.id === locationId)
        const jitter = (val:number, seed:number) => {
          const base = 0.00015
          const dir = ((seed % 4) - 1.5) // -1.5,-0.5,0.5,1.5
          return val + base * dir
        }
        const jLat = jitter(loc?.lat ?? 0, nextZoneNumber)
        const jLng = jitter(loc?.lng ?? 0, nextZoneNumber + 1)
        setZoneForm({
          name: `Zone ${String.fromCharCode(64 + nextZoneNumber)}`,
          zone_number: nextZoneNumber,
          cost_per_hour: 15.00,
          total_slots: 50,
          lat: jLat,
          lng: jLng,
        })
      } catch (error) {
        const loc = locations.find(l => l.id === locationId)
        const jitter = (val:number, seed:number) => {
          const base = 0.00015
          const dir = ((seed % 4) - 1.5)
          return val + base * dir
        }
        const jLat = jitter(loc?.lat ?? 0, 1)
        const jLng = jitter(loc?.lng ?? 0, 2)
        setZoneForm({
          name: '',
          zone_number: 1,
          cost_per_hour: 15.00,
          total_slots: 50,
          lat: jLat,
          lng: jLng,
        })
      }
    }
  }

  const handleSaveZone = async () => {
    if (!editingZone || !user) return

    // Validate form data
    if (!zoneForm.name.trim()) {
      toast.error('Please enter a zone name')
      return
    }
    if (zoneForm.zone_number < 1) {
      toast.error('Zone number must be at least 1')
      return
    }
    if (zoneForm.cost_per_hour < 0) {
      toast.error('Cost per hour cannot be negative')
      return
    }
    if (zoneForm.total_slots < 1) {
      toast.error('Total slots must be at least 1')
      return
    }

    try {
      // Basic validation for coordinates
      if (zoneForm.lat == null || zoneForm.lng == null || isNaN(zoneForm.lat) || isNaN(zoneForm.lng)) {
        toast.error('Please provide valid latitude and longitude for the zone')
        return
      }
      if (zoneForm.lat === 0 && zoneForm.lng === 0) {
        toast.error('Zone coordinates cannot be 0,0')
        return
      }

      if (editingZone.zone) {
        // Update existing zone
        const { data, error } = await supabase
          .from('parking_zones')
          .update({
            name: zoneForm.name,
            zone_number: zoneForm.zone_number,
            lat: zoneForm.lat,
            lng: zoneForm.lng,
            cost_per_hour: zoneForm.cost_per_hour,
            total_slots: zoneForm.total_slots,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingZone.zone.id)
          .select()

        if (error) {
          throw error
        }
        
        toast.success('Zone updated successfully!')
      } else {
        // Create new zone
        const zoneData = {
          location_id: editingZone.locationId,
          name: zoneForm.name,
          zone_number: zoneForm.zone_number,
          lat: zoneForm.lat,
          lng: zoneForm.lng,
          cost_per_hour: zoneForm.cost_per_hour,
          total_slots: zoneForm.total_slots,
          available_slots: zoneForm.total_slots
        }
        
        
        const { data, error } = await supabase
          .from('parking_zones')
          .insert(zoneData)
          .select()
          .single()

        if (error) {
          throw error
        }
        
        toast.success('Zone added successfully!')
      }

      // Close modal and reset form
      setEditingZone(null)
      setZoneForm({ name: '', zone_number: 1, cost_per_hour: 15.00, total_slots: 50, lat: 0, lng: 0 })
      
      // Refresh data from server
      await refreshLocations()
    } catch (error) {
      toast.error(`Failed to save zone: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {userRole === 'super_admin' ? 'Location Management' : 'Owner Dashboard'}
            </h1>
            <p className="text-gray-600 mt-2">Manage your parking locations and zones</p>
          </div>
          <Button onClick={() => setShowLocationPicker(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Location
          </Button>
        </div>
      </motion.div>

      {/* LocationPicker Modal */}
      {showLocationPicker && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SimpleLocationPicker
            onLocationSelect={async (locationData) => {
              if (!user) return
              
              try {
                
                // Validate data
                if (!locationData.name || !locationData.address || !locationData.lat || !locationData.lng) {
                  throw new Error('Missing required location data')
                }

                // Create location
                const { data: newLocationData, error: locationError } = await supabase
                  .from('parking_locations')
                  .insert({
                    name: locationData.name,
                    address: locationData.address,
                    lat: locationData.lat,
                    lng: locationData.lng,
                    owner_user_id: user.id
                  })
                  .select()
                  .single()

                if (locationError) {
                  throw new Error(`Database error: ${locationError.message}`)
                }

                
                toast.success(`✅ Location "${locationData.name}" created successfully! Add zones manually.`)
                setShowLocationPicker(false)
                
                // Refresh locations
                await refreshLocations()
              } catch (error) {
                toast.error(`Failed to add location: ${error.message}`)
              }
            }}
            onCancel={() => setShowLocationPicker(false)}
          />
        </motion.div>
      )}


      {/* Locations List */}
      <div className="space-y-6">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Locations Yet</h3>
              <p className="text-gray-500 mb-4">Start by adding your first parking location</p>
              <Button onClick={() => setShowLocationPicker(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          locations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      {location.name}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditLocation(location)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditZone(location.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Zone
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLocation(location.id, location.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardTitle>
                  <p className="text-gray-600">{location.address}</p>
                </CardHeader>
                <CardContent>
                  {location.zones.length === 0 ? (
                    <div className="text-center py-4">
                      <Car className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No zones added yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {location.zones.map((zone) => (
                        <div key={zone.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{zone.name}</h4>
                            <div className="flex space-x-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditZone(location.id, zone)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteZone(zone.id, zone.name)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Zone #{zone.zone_number}</p>
                            <p>Total Slots: {zone.total_slots}</p>
                            <p>Available: {zone.available_slots}</p>
                            <p>Rate: ₹{zone.cost_per_hour}/hr</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Location Edit Modal */}
      {editingLocationId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Edit Location
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditingLocationId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="editLocationName">Location Name</Label>
                  <Input
                    id="editLocationName"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                    placeholder="Location name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="editLocationAddress">Address</Label>
                  <Textarea
                    id="editLocationAddress"
                    value={locationForm.address}
                    onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                    placeholder="Full address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editLatitude">Latitude</Label>
                    <Input
                      id="editLatitude"
                      type="number"
                      step="0.000001"
                      value={locationForm.lat}
                      onChange={(e) => setLocationForm({ ...locationForm, lat: parseFloat(e.target.value) || 0 })}
                      placeholder="12.9329"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editLongitude">Longitude</Label>
                    <Input
                      id="editLongitude"
                      type="number"
                      step="0.000001"
                      value={locationForm.lng}
                      onChange={(e) => setLocationForm({ ...locationForm, lng: parseFloat(e.target.value) || 0 })}
                      placeholder="77.5348"
                    />
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleUpdateLocation} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Update Location
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingLocationId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Zone Edit Modal */}
      {editingZone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {editingZone.zone ? 'Edit Zone' : 'Add New Zone'}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditingZone(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="zoneName">Zone Name</Label>
                  <Input
                    id="zoneName"
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                    placeholder="e.g., Zone A, Premium Zone"
                  />
                </div>
                
                <div>
                  <Label htmlFor="zoneNumber">Zone Number</Label>
                  <Input
                    id="zoneNumber"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={zoneForm.zone_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '') // Remove non-digits
                      const numValue = parseInt(value) || 1
                      setZoneForm({ ...zoneForm, zone_number: numValue })
                    }}
                    placeholder="1"
                    className="text-center"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-incremented based on existing zones
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costPerHour">Cost Per Hour (₹)</Label>
                    <Input
                      id="costPerHour"
                      type="text"
                      inputMode="decimal"
                      value={zoneForm.cost_per_hour}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.]/g, '') // Allow only digits and decimal
                        const numValue = parseFloat(value) || 0
                        setZoneForm({ ...zoneForm, cost_per_hour: numValue })
                      }}
                      placeholder="15.00"
                      className="text-center"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="totalSlots">Total Slots</Label>
                    <Input
                      id="totalSlots"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={zoneForm.total_slots}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '') // Remove non-digits
                        const numValue = parseInt(value) || 0
                        setZoneForm({ ...zoneForm, total_slots: numValue })
                      }}
                      placeholder="50"
                      className="text-center"
                    />
                  </div>
                </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="zoneLat">Latitude</Label>
                   <Input
                     id="zoneLat"
                     type="number"
                     step="0.000001"
                     value={zoneForm.lat}
                     onChange={(e) => setZoneForm({ ...zoneForm, lat: parseFloat(e.target.value) || 0 })}
                     placeholder="12.9716"
                   />
                 </div>
                 <div>
                   <Label htmlFor="zoneLng">Longitude</Label>
                   <Input
                     id="zoneLng"
                     type="number"
                     step="0.000001"
                     value={zoneForm.lng}
                     onChange={(e) => setZoneForm({ ...zoneForm, lng: parseFloat(e.target.value) || 0 })}
                     placeholder="77.5946"
                   />
                 </div>
               </div>

               <div className="flex space-x-2 pt-4">
                 <Button onClick={handleSaveZone} className="flex-1">
                   <Save className="h-4 w-4 mr-2" />
                   {editingZone.zone ? 'Update Zone' : 'Create Zone'}
                 </Button>
                 <Button 
                   variant="outline" 
                   onClick={() => setEditingZone(null)}
                 >
                   Cancel
                 </Button>
               </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => 
        setDeleteDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteDialog.type === 'location' ? 'Location' : 'Zone'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.name}"?
              {deleteDialog.type === 'location' && 
                ' This will also permanently delete all zones in this location.'
              }
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete {deleteDialog.type === 'location' ? 'Location' : 'Zone'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}