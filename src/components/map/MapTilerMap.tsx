import { useEffect, useRef, useState } from "react";

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  availableSlots: number;
  totalSlots: number;
}

interface MapTilerMapProps {
  locations: Location[];
  onLocationClick: (locationId: string) => void;
  selectedLocationId?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  zonePin?: { lat: number; lng: number; label: string; url: string };
}

export function MapTilerMap({
  locations,
  onLocationClick,
  selectedLocationId,
  center = { lat: 12.9734, lng: 77.7142 },
  zoom = 12,
  zonePin,
}: MapTilerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const markersLayerRef = useRef<any>(null);

  // Load Leaflet CSS + JS once
  useEffect(() => {
    if ((window as any).L) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.id = "leaflet-js";
      document.head.appendChild(script);
    }
  }, []);

  // Initialize map only once
  useEffect(() => {
    const L = (window as any).L;
    if (!L) return;
    if (map) return;
    if (!mapRef.current) return;

    // Reset old Leaflet instance if exists
    const anyRef: any = mapRef.current as any;
    if (anyRef._leaflet_id) anyRef._leaflet_id = null;

    const newMap = L.map(mapRef.current).setView(
      [center.lat, center.lng],
      zoom
    );

    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=bUtgcZnxNjR0qtG7QluP`,
      {
        attribution: "© MapTiler © OpenStreetMap contributors",
        maxZoom: 18,
      }
    ).addTo(newMap);

    newMap.whenReady(() => setMap(newMap));

    return () => {
      try {
        newMap.remove();
      } catch {}
      setMap(null);
    };
  }, [center.lat, center.lng, zoom]); // SAFE dependencies

  // Render markers
  useEffect(() => {
    const L = (window as any).L;
    if (!map || !L) return;
    if (!(map as any)._loaded) return;

    // Remove previous layer if any
    if (markersLayerRef.current) {
      try {
        map.removeLayer(markersLayerRef.current);
      } catch {}
    }

    const layer = L.layerGroup().addTo(map);
    markersLayerRef.current = layer;

    // Location markers
    locations.forEach((location) => {
      if (!location || location.lat == null || location.lng == null) return;

      const { name = "Unknown", totalSlots = 0, availableSlots = 0 } = location;

      const availabilityPercentage =
        totalSlots > 0 ? (availableSlots / totalSlots) * 100 : 0;

      const markerColor =
        availabilityPercentage >= 70
          ? "#10B981"
          : availabilityPercentage >= 30
          ? "#F59E0B"
          : "#EF4444";

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="width:32px;height:32px;background-color:${markerColor};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:10px;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;">
            ${availableSlots}
          </div>
          <div style="position:absolute;top:-25px;left:50%;transform:translateX(-50%);background-color:${markerColor};color:white;padding:2px 6px;border-radius:8px;font-size:9px;font-weight:bold;white-space:nowrap;border:1px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
            ${name}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([location.lat, location.lng], {
        icon: customIcon,
      }).addTo(layer);

      marker.on("click", () => onLocationClick(location.id));
    });

    // Zone Pin Marker
    if (zonePin && zonePin.lat != null && zonePin.lng != null) {
      const zoneIcon = L.divIcon({
        html: `
          <div style="position:relative;">
            <div style="width:14px;height:14px;background-color:#2563EB;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
            <a href="https://www.google.com/maps/search/?api=1&query=${zonePin.lat},${zonePin.lng}" target="_blank" rel="noopener noreferrer"
              style="position:absolute;top:-28px;left:8px;transform:translateX(0);background:#2563EB;color:white;padding:2px 6px;border-radius:6px;font-size:10px;text-decoration:none;white-space:nowrap;border:1px solid white;">
              ${zonePin.label}
            </a>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([zonePin.lat, zonePin.lng], { icon: zoneIcon }).addTo(layer);

      try {
        map.setView([zonePin.lat, zonePin.lng], Math.max(14, map.getZoom()));
      } catch {}
    }
  }, [map, locations, onLocationClick, zonePin]); // removed markersLayer → FIXED!

  return (
    <div
      ref={mapRef}
      style={{ height: "100%", width: "100%", zIndex: 1 }}
      id="maptiler-container"
    />
  );
}
