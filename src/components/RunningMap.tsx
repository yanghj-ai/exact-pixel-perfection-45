import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '@/lib/running';

interface RunningMapProps {
  route: GeoPoint[];
  isLive?: boolean;
  className?: string;
}

export default function RunningMap({ route, isLive = false, className = '' }: RunningMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center: [number, number] = route.length > 0
      ? [route[0].lat, route[0].lng]
      : [37.5665, 126.9780]; // Seoul default

    const map = L.map(mapRef.current, {
      center,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || route.length < 1) return;

    const latlngs: [number, number][] = route.map(p => [p.lat, p.lng]);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs);
    } else {
      polylineRef.current = L.polyline(latlngs, {
        color: 'hsl(15, 90%, 55%)',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(map);
    }

    // Current position marker
    if (isLive && route.length > 0) {
      const last = route[route.length - 1];
      if (markerRef.current) {
        markerRef.current.setLatLng([last.lat, last.lng]);
      } else {
        markerRef.current = L.circleMarker([last.lat, last.lng], {
          radius: 8,
          fillColor: 'hsl(15, 90%, 55%)',
          fillOpacity: 1,
          color: '#fff',
          weight: 3,
        }).addTo(map);
      }
      map.panTo([last.lat, last.lng], { animate: true });
    } else if (!isLive && latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    }
  }, [route, isLive]);

  return (
    <div
      ref={mapRef}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: 200 }}
    />
  );
}
