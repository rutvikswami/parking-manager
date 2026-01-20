import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Car, MapPin, Search, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ZoneCard } from "@/components/zones/ZoneCard";
import { OwnerApplicationButton } from "@/components/OwnerApplicationButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import type { Database } from "@/lib/supabase";

type ParkingLocation = Database["public"]["Tables"]["parking_locations"]["Row"];
type ParkingZone = Database["public"]["Tables"]["parking_zones"]["Row"];
// features aligned with current schema (reservations removed)

interface LocationWithZones extends ParkingLocation {
  zones: ParkingZone[];
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const userReservations: any[] = [];
const setUserReservations = (_: any) => {};
  const [loading, setLoading] = useState(true);
  
  // const [selectedZoneForReservation, setSelectedZoneForReservation] =
//   useState<ParkingZone | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<ParkingLocation | null>(null);
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalZones: 0,
    totalSlots: 0,
    availableSlots: 0,
  });
  const isSuperAdmin = user?.user_metadata?.role === "super_admin";

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from("parking_locations")
          .select("*")
          .order("name");

        if (error) throw error;

        if (data) {
          setLocations(data);
          if (data.length > 0 && !selectedLocationId) {
            setSelectedLocationId(data[0].id);
          }
        }
      } catch (error) {
        toast.error("Failed to load parking locations");
      }
    };

    fetchLocations();
  }, []);

  // Fetch zones for selected location
  useEffect(() => {
    const fetchZones = async () => {
      if (!selectedLocationId) return;

      try {
        const { data, error } = await supabase
          .from("parking_zones")
          .select("*")
          .eq("location_id", selectedLocationId)
          .order("name");

        if (error) throw error;

        if (data) {
          setZones(data);

          // Set selected location object
          const currentLocation = locations.find(
            (loc) => loc.id === selectedLocationId
          );
          setSelectedLocation(currentLocation || null);

          // Calculate stats for selected location
          const totalSlots = data.reduce(
            (sum, zone) => sum + zone.total_slots,
            0
          );
          const availableSlots = data.reduce(
            (sum, zone) => sum + zone.available_slots,
            0
          );

          setStats({
            totalLocations: locations.length,
            totalZones: data.length,
            totalSlots,
            availableSlots,
          });
        }
      } catch (error) {
        toast.error("Failed to load parking zones");
      } finally {
        setLoading(false);
      }
    };

    fetchZones();

    // Set up real-time subscription for zones
    const zonesSubscription = supabase
      .channel("parking_zones_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parking_zones",
          filter: `location_id=eq.${selectedLocationId}`,
        },
        () => {
          fetchZones();
        }
      )
      .subscribe();

    return () => {
      zonesSubscription.unsubscribe();
    };
  }, [selectedLocationId, locations.length]);

  const handleViewOnMap = (zoneId: string) => {
    navigate(`/map?zone=${zoneId}`);
  };

  // const handleReserve = (zoneId: string) => {
//   const zone = zones.find((z) => z.id === zoneId);
//   if (zone) {
//     setSelectedZoneForReservation(zone);
//     setReserveDialogOpen(true);
//   }
// };

  const handleReservationSuccess = () => {
    // Refresh zones after successful action
    window.location.reload(); // Simple refresh for now
  };

  if (loading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Parking Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your parking across multiple locations
          </p>
        </div>
        <div className="hidden md:flex items-center space-x-3">
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => navigate("/map")}
          >
            <MapPin className="h-4 w-4" />
            <span>Explore Map</span>
          </Button>
        </div>
      </motion.div>

      {/* Become Owner CTA */}
      {!isSuperAdmin && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <OwnerApplicationButton />
      </motion.div>
      )}

      {/* Location Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Select Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search-enabled Location Selector */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search parking locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="pl-10"
                />
              </div>

              {/* Dropdown Results */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {locations
                    .filter(
                      (location) =>
                        location.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        location.address
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                    )
                    .map((location) => (
                      <div
                        key={location.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setSelectedLocationId(location.id);
                          setSearchQuery(location.name);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{location.name}</div>
                            <div className="text-sm text-gray-500">
                              {location.address}
                            </div>
                          </div>
                          <button
                            className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                location.name + " " + location.address
                              )}`;
                              window.open(url, "_blank");
                            }}
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {locations.filter(
                    (location) =>
                      location.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      location.address
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  ).length === 0 &&
                    searchQuery && (
                      <div className="p-3 text-gray-500 text-center">
                        No locations found matching "{searchQuery}"
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Click outside to close dropdown */}
            {isDropdownOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              ></div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      {selectedLocationId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Location</p>
                  <p className="text-lg font-bold">{selectedLocation?.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Car className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Zones</p>
                  <p className="text-2xl font-bold">{stats.totalZones}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Car className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-2xl font-bold">{stats.availableSlots}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Car className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Slots</p>
                  <p className="text-2xl font-bold">{stats.totalSlots}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Zones Grid */}
      {selectedLocationId && zones.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <div>Parking Zones - {selectedLocation?.name}</div>
                  <p className="text-gray-600 text-sm font-normal">
                    Available zones in this location
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 px-4 py-2"
                    onClick={() => navigate("/map")}
                  >
                    <MapPin className="h-4 w-4" />
                    <span>View on Map</span>
                  </Button>
                  <button
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    onClick={() => {
                      if (selectedLocation) {
                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          selectedLocation.name + " " + selectedLocation.address
                        )}`;
                        window.open(url, "_blank");
                      }
                    }}
                    title="Open in Google Maps"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {zones.map((zone, index) => (
                  <motion.div
                    key={zone.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <ZoneCard
                      zone={zone}
                      onViewOnMap={handleViewOnMap}
                      locationLat={selectedLocation?.lat}
                      locationLng={selectedLocation?.lng}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </div>
  );
}
