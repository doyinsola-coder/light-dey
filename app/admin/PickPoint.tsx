"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import type { City } from "@/lib/cities";

// Tap the map where the town is. Existing towns in the state show as grey dots so you don't add one twice.
function Taps({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Moves the map only when the state changes, not on every tap
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [map, lat, lng, zoom]);
  return null;
}

export default function PickPoint({
  towns,
  point,
  onPick,
}: {
  towns: City[];
  point: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = towns.length
    ? [towns.reduce((s, t) => s + t.center[0], 0) / towns.length, towns.reduce((s, t) => s + t.center[1], 0) / towns.length]
    : [9.08, 8.68];
  const zoom = towns.length ? 8 : 6;
  return (
    <div className="h-72 overflow-hidden rounded-2xl border border-(--line)">
      <MapContainer center={center} zoom={zoom} className="h-full w-full" attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyTo lat={center[0]} lng={center[1]} zoom={zoom} />
        <Taps onPick={onPick} />
        {towns.map((t) => (
          <CircleMarker key={t.city} center={[t.center[0], t.center[1]]} radius={5} pathOptions={{ color: "#9AA3B2", fillColor: "#5B6472", fillOpacity: 0.9 }}>
            <Tooltip>{t.city}</Tooltip>
          </CircleMarker>
        ))}
        {point && <CircleMarker center={point} radius={10} pathOptions={{ color: "#FFE08A", fillColor: "#FFC531", fillOpacity: 1 }} />}
      </MapContainer>
    </div>
  );
}
