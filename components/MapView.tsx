"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaStatus } from "@/lib/types";
import { useCities } from "@/lib/cities";
import { timeAgo } from "@/lib/helpers";

const COLORS = {
  on: { fill: "#FFC531", stroke: "#FFE08A" },
  off: { fill: "#5B6472", stroke: "#9AA3B2" },
  unknown: { fill: "transparent", stroke: "#5B6472" },
};

type Props = {
  city: string;
  areas: AreaStatus[];
  currentAreaId: string;
  onOpen: (areaId: string) => void;
};

export default function MapView({ city, areas, currentAreaId, onOpen }: Props) {
  const cities = useCities();
  const center = cities.find((c) => c.city === city)?.center ?? [8.4966, 4.5421];
  // Every ward now has a starting pin, so a big city would be hundreds of empty rings.
  // Show areas with reports; show the quiet ones too only when there aren't many.
  const withPin = areas.filter((a) => a.lat !== null && a.lng !== null);
  const pinned = withPin.length > 40 ? withPin.filter((a) => a.status !== "unknown") : withPin;

  return (
    <div className="h-[58dvh] overflow-hidden rounded-[22px] border border-(--line)">
      <MapContainer
        key={city}
        center={[center[0], center[1]]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: "#0E1014" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {pinned.map((a) => {
          const c = COLORS[a.status];
          const mine = a.area_id === currentAreaId;
          return (
            <CircleMarker
              key={a.area_id}
              center={[a.lat as number, a.lng as number]}
              radius={mine ? 14 : 10}
              pathOptions={{
                color: mine ? "#F3F1EA" : c.stroke,
                weight: mine ? 3 : 2,
                fillColor: c.fill,
                fillOpacity: a.status === "unknown" ? 0 : 0.9,
              }}
            >
              <Popup>
                <div className="flex min-w-40 flex-col gap-1.5">
                  <strong className="text-[15px]">{a.name}</strong>
                  <span className="text-[13px]">
                    {a.status === "on" && `Light dey · ${timeAgo(a.last_report_at)}`}
                    {a.status === "off" && `No light · ${timeAgo(a.last_report_at)}`}
                    {a.status === "unknown" && "No reports in the last hour"}
                  </span>
                  <button
                    onClick={() => onOpen(a.area_id)}
                    className="mt-1 min-h-10 rounded-xl bg-(--light) px-3 text-sm font-bold text-(--ink)"
                  >
                    Open {a.name}
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}