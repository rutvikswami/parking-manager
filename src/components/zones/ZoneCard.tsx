import { motion } from 'framer-motion'
import { MapPin, Car, Clock, IndianRupee, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase'

type ParkingZone = Database['public']['Tables']['parking_zones']['Row']

interface ZoneCardProps {
  zone: ParkingZone
  onViewOnMap: (zoneId: string) => void,
  locationLat?: number | null,
  locationLng?: number | null
}

export function ZoneCard({ zone, onViewOnMap, locationLat, locationLng }: ZoneCardProps) {
  const availabilityPercentage = (zone.available_slots / zone.total_slots) * 100
  
  const getAvailabilityColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600'
    if (percentage >= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAvailabilityBgColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-100'
    if (percentage >= 30) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">{zone.name}</CardTitle>
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityBgColor(
                availabilityPercentage
              )} ${getAvailabilityColor(availabilityPercentage)}`}
            >
              {availabilityPercentage.toFixed(0)}% Available
            </div>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <MapPin className="h-4 w-4 mr-1" />
            Zone #{zone.zone_number}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Slots Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-600">
                  {zone.available_slots}
                </div>
                <div className="text-xs text-gray-500">Available</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-semibold">{zone.total_slots}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <IndianRupee className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-bold text-blue-600">
                ₹{zone.cost_per_hour}
              </div>
              <div className="text-xs text-blue-500">per hour</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={zone.available_slots === 0}
              onClick={() => onViewOnMap(zone.id)}
            >
              <Clock className="h-4 w-4 mr-1" />
              Redirect
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 flex items-center justify-center gap-1"
              disabled={zone.available_slots === 0}
              onClick={() => {
                const lat = (zone as any)?.lat ?? locationLat;
                const lng = (zone as any)?.lng ?? locationLng;
                if (lat != null && lng != null) {
                  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              }}
              aria-label="Open this zone in Google Maps"
              title="Open in Google Maps"
            >
              <MapPin className="h-4 w-4" />
              Gmaps
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}