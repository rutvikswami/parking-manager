import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Save, X, Navigation, Search, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

interface SimpleLocationPickerProps {
  onLocationSelect: (location: {
    name: string
    address: string
    lat: number
    lng: number
  }) => void
  onCancel: () => void
  initialLocation?: {
    name: string
    address: string
    lat: number
    lng: number
  }
}

export function SimpleLocationPicker({ onLocationSelect, onCancel, initialLocation }: SimpleLocationPickerProps) {
  const [locationData, setLocationData] = useState({
    name: initialLocation?.name || '',
    address: initialLocation?.address || '',
    lat: initialLocation?.lat || 0,
    lng: initialLocation?.lng || 0
  })

  const [searchAddress, setSearchAddress] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  // Get user's current location using browser geolocation
  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        setLocationData(prev => ({
          ...prev,
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          address: prev.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        }))
        
        setIsGettingLocation(false)
        toast.success('Current location captured!')
      },
      (error) => {
        // Geolocation error
        toast.error('Unable to get current location')
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Search using multiple geocoding services for better accuracy
  const searchLocation = async () => {
    if (!searchAddress.trim()) {
      toast.error('Please enter an address to search')
      return
    }

    try {
      // Try OpenStreetMap Nominatim first with better parameters
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(searchAddress)}&` +
        `limit=3&` +
        `countrycodes=in&` + // Focus on India
        `addressdetails=1&` +
        `extratags=1`

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'ParkingApp/1.0'
        }
      })
      
      if (!response.ok) throw new Error('Search service unavailable')
      
      const data = await response.json()
      
      if (data && data.length > 0) {
        // Find the best match (prefer places with higher importance)
        const bestResult = data.reduce((best, current) => {
          const currentScore = parseFloat(current.importance || 0)
          const bestScore = parseFloat(best.importance || 0)
          return currentScore > bestScore ? current : best
        })

        setLocationData(prev => ({
          ...prev,
          lat: parseFloat(bestResult.lat),
          lng: parseFloat(bestResult.lon),
          address: bestResult.display_name,
          name: prev.name || bestResult.display_name.split(',')[0].trim()
        }))
        
        toast.success(`Location found: ${bestResult.display_name.split(',')[0]}`)
      } else {
        // Fallback: suggest manual input with Indian city coordinates
        toast.error('Location not found. Try selecting a nearby city and adjusting manually.')
      }
    } catch (error) {
      // Search error
      toast.error('Search failed. Please use manual coordinate input or select a nearby city.')
    }
  }

  // Popular city coordinates for quick selection
  const popularCities = [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 }
  ]

  const selectCity = (city: typeof popularCities[0]) => {
    setLocationData(prev => ({
      ...prev,
      lat: city.lat,
      lng: city.lng,
      address: prev.address || `${city.name}, India`,
      name: prev.name || `Parking Location - ${city.name}`
    }))
    toast.success(`${city.name} coordinates selected!`)
  }

  const handleSave = () => {
    if (!locationData.name.trim()) {
      toast.error('Please enter a location name')
      return
    }
    if (locationData.lat === 0 && locationData.lng === 0) {
      toast.error('Please provide valid latitude and longitude coordinates')
      return
    }
    if (!locationData.address.trim()) {
      toast.error('Please enter an address')
      return
    }

    // Clean and validate coordinates
    const cleanedData = {
      ...locationData,
      lat: Math.abs(locationData.lat), // Remove any negative signs for Indian coordinates
      lng: Math.abs(locationData.lng) // Remove any negative signs for Indian coordinates
    }

    onLocationSelect(cleanedData)
  }

  const copyCoordinates = () => {
    const coords = `${locationData.lat}, ${locationData.lng}`
    navigator.clipboard.writeText(coords)
    toast.success('Coordinates copied to clipboard!')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Add Location - Easy Input</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Location Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="locationName">Location Name *</Label>
              <Input
                id="locationName"
                value={locationData.name}
                onChange={(e) => setLocationData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Central Mall Parking, Office Complex A"
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={locationData.address}
                onChange={(e) => setLocationData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address of the parking location"
              />
            </div>
          </div>

          {/* Quick Location Options */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold">Quick Location Setup</Label>
            
            {/* Current Location */}
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex-1"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
              </Button>
            </div>

            {/* Address Search */}
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="Search by address (e.g., Connaught Place, Delhi)"
                  onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                />
                <Button onClick={searchLocation}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Popular Cities */}
            <div>
              <Label className="text-sm text-gray-600">Quick City Selection:</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {popularCities.map((city) => (
                  <Button
                    key={city.name}
                    variant="outline"
                    size="sm"
                    onClick={() => selectCity(city)}
                    className="text-xs"
                  >
                    {city.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Manual Coordinates Input */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold">Coordinates</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude *</Label>
                <Input
                  id="latitude"
                  type="text"
                  value={locationData.lat}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d.-]/g, '') // Remove N, S, spaces
                    const numValue = parseFloat(value) || 0
                    setLocationData(prev => ({ ...prev, lat: numValue }))
                  }}
                  placeholder="e.g., 12.9329 or 12.9329 N"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude *</Label>
                <Input
                  id="longitude"
                  type="text"
                  value={locationData.lng}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d.-]/g, '') // Remove E, W, spaces
                    const numValue = parseFloat(value) || 0
                    setLocationData(prev => ({ ...prev, lng: numValue }))
                  }}
                  placeholder="e.g., 77.5348 or 77.5348 E"
                />
              </div>
            </div>
            
            {(locationData.lat !== 0 || locationData.lng !== 0) && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Coordinates: {locationData.lat}, {locationData.lng}</span>
                <Button variant="ghost" size="sm" onClick={copyCoordinates}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}

          </div>


          {/* Help Text */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">How to get coordinates:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use "Current Location" button if you're at the parking spot</li>
              <li>• Search by address using the search box above</li>
              <li>• Select a nearby city and adjust manually</li>
              <li>• Find coordinates on Google Maps: Right-click → "What's here?"</li>
              <li>• Use any map app and copy the coordinates</li>
              <li>• Coordinates support formats: "12.9329 N" or "77.5348 E" or just "12.9329"</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 justify-end pt-4">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Location
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}