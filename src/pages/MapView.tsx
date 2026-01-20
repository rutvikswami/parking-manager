import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapTilerMap } from "@/components/map/MapTilerMap";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

import type { Database } from "@/lib/supabase";

// Use the centralized database types
type ParkingZone = Database["public"]["Tables"]["parking_zones"]["Row"];
type ParkingLocation = Database["public"]["Tables"]["parking_locations"]["Row"];

interface LocationWithStats extends ParkingLocation {
  zones: ParkingZone[];
  totalSlots: number;
  availableSlots: number;
  occupancyPercentage: number;
}

export function MapView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locationsWithZones, setLocationsWithZones] = useState<
    LocationWithStats[]
  >([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationWithStats | null>(null);
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  // 1. Fetch Data Effect (Runs once on mount)
  useEffect(() => {
    const fetchLocationsWithZones = async () => {
      try {
        // Optimized: Fetch locations AND zones in one query using Supabase relationships
        // Note: This assumes a foreign key exists between parking_zones and parking_locations
        const { data: locations, error } = await supabase
          .from("parking_locations")
          .select(
            `
            *,
            zones:parking_zones(*)
          `
          )
          .order("name");

        if (error) throw error;

        if (!locations) {
          setLocationsWithZones([]);
          return;
        }

        // Process the data to calculate stats
        const processedData: LocationWithStats[] = locations.map(
          (location: any) => {
            const zones = (location.zones as ParkingZone[]) || [];

            // Sort zones by number explicitly in JS to ensure order
            zones.sort((a, b) => (a.zone_number || 0) - (b.zone_number || 0));

            const totalSlots = zones.reduce(
              (sum, zone) => sum + (zone.total_slots || 0),
              0
            );
            const availableSlots = zones.reduce(
              (sum, zone) => sum + (zone.available_slots || 0),
              0
            );
            const occupancyPercentage =
              totalSlots > 0
                ? ((totalSlots - availableSlots) / totalSlots) * 100
                : 0;

            return {
              ...location,
              zones,
              totalSlots,
              availableSlots,
              occupancyPercentage,
            };
          }
        );

        setLocationsWithZones(processedData);
      } catch (error) {
        // Error fetching parking data
        toast.error("Failed to load parking data");
      } finally {
        setLoading(false);
      }
    };

    fetchLocationsWithZones();
  }, []);

  // 2. Selection Sync Effect (Runs when data or URL params change)
  useEffect(() => {
    if (loading || locationsWithZones.length === 0) return;

    const zoneId = searchParams.get("zone");

    if (zoneId) {
      // Find the location containing this zone
      for (const location of locationsWithZones) {
        const zone = location.zones.find((z) => z.id === zoneId);
        if (zone) {
          setSelectedLocation(location);
          setSelectedZone(zone);
          return; // Found it, stop searching
        }
      }
    } else {
      // Optional: Clear selection if no param (or keep last selected)
      // setSelectedZone(null)
    }
  }, [searchParams, locationsWithZones, loading]);

  const handleLocationSelect = (location: LocationWithStats) => {
    setSelectedLocation(location);
    setSelectedZone(null);
    // Clear the zone param when selecting a parent location
    setSearchParams({});
  };

  const handleZoneSelect = (zone: ParkingZone) => {
    setSelectedZone(zone);
    // Update URL without reloading the page
    setSearchParams({ zone: zone.id });
  };

  const getZoneAvailabilityColor = (zone: ParkingZone) => {
    if (!zone.total_slots) return "bg-gray-300";
    const percentage = (zone.available_slots / zone.total_slots) * 100;
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Helper to safely get coordinates (Fallback: Zone -> Location)
  const getCoordinates = (
    zone?: ParkingZone | null,
    location?: LocationWithStats | null
  ) => {
    const targetLat = zone?.lat ?? location?.lat;
    const targetLng = zone?.lng ?? location?.lng;
    return { lat: targetLat, lng: targetLng };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900">
          Parking Locations Map
        </h1>
        <p className="text-gray-600 mt-2">Find parking locations and zones</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Area */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <MapPin className="h-5 w-5 mr-2" />
                Parking Locations
              </CardTitle>
            </CardHeader>
            <CardContent
              className="h-[520px] p-4 relative"
              onDoubleClick={() => setShowDebug(!showDebug)}
            >
              <MapTilerMap
                locations={locationsWithZones.map((location) => ({
                  id: location.id,
                  name: location.name,
                  lat: location.lat,
                  lng: location.lng,
                  availableSlots: location.availableSlots,
                  totalSlots: location.totalSlots,
                }))}
                // Construct the pin based on safe coordinate access
                zonePin={(() => {
                  const { lat, lng } = getCoordinates(
                    selectedZone,
                    selectedLocation
                  );
                  if (lat == null || lng == null) return undefined;

                  return {
                    lat,
                    lng,
                    label:
                      selectedZone?.name || selectedLocation?.name || "Unknown",
                    url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                  };
                })()}
                onLocationClick={(locationId) => {
                  const location = locationsWithZones.find(
                    (l) => l.id === locationId
                  );
                  if (location) handleLocationSelect(location);
                }}
                selectedLocationId={selectedLocation?.id}
                center={{ lat: 12.9734, lng: 77.7142 }}
                zoom={12}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Locations List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle>All Locations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto h-[520px]">
              {locationsWithZones.map((location) => (
                <div
                  key={location.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedLocation?.id === location.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleLocationSelect(location)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{location.name}</h4>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {location.address}
                      </p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        location.totalSlots > 0 &&
                        location.availableSlots / location.totalSlots >= 0.7
                          ? "bg-green-500"
                          : location.totalSlots > 0 &&
                            location.availableSlots / location.totalSlots >= 0.3
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-600">
                      {location.availableSlots}/{location.totalSlots} slots
                    </span>
                    <span className="text-gray-500">
                      {location.zones.length} zones
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Selected Location Zones */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          {selectedLocation ? (
            <Card className="h-[600px]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  {selectedLocation.name}
                </CardTitle>
                <p className="text-sm text-gray-600">Zones in this location</p>
              </CardHeader>
              <CardContent className="space-y-3 overflow-y-auto h-[520px]">
                {selectedLocation.zones.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">
                    No zones configured.
                  </p>
                ) : (
                  selectedLocation.zones.map((zone) => (
                    <motion.div
                      key={zone.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedZone?.id === zone.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleZoneSelect(zone)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{zone.name}</h4>
                          <p className="text-xs text-gray-600">
                            ₹{zone.cost_per_hour}/hour
                          </p>
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${getZoneAvailabilityColor(
                            zone
                          )}`}
                        ></div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between mt-2 text-xs">
                        <span className="text-gray-600">
                          {zone.available_slots}/{zone.total_slots} available
                        </span>
                        <div className="flex w-full sm:w-auto gap-2">
                          {/* Fixed: Use setSearchParams instead of window.location.href */}
                          <Button
                            size="sm"
                            className="text-xs px-2 py-1 h-6 w-full sm:w-auto"
                            disabled={zone.available_slots === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchParams({ zone: zone.id });
                            }}
                          >
                            Select
                          </Button>

                          {/* Fixed: Safe coordinate access without 'as any' */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-6 w-full sm:w-auto flex items-center gap-1 whitespace-nowrap"
                            disabled={zone.available_slots === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const { lat, lng } = getCoordinates(
                                zone,
                                selectedLocation
                              );

                              if (lat != null && lng != null) {
                                const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                window.open(
                                  url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              } else {
                                toast.error("Coordinates not available");
                              }
                            }}
                            aria-label="Open this zone in Google Maps"
                            title="Open in Google Maps"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Maps
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Select a Location
                </h3>
                <p className="text-sm text-gray-500">
                  Tap on any location on the map to view its zones
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
