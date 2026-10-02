export type Status = "on" | "off" | "unknown";

export type AreaStatus = {
  area_id: string;
  state: string;
  city: string;
  name: string;
  lat: number | null;
  lng: number | null;
  status: Status;
  on_count: number;
  off_count: number;
  last_report_at: string | null;
};

// center = where the map opens for each city [lat, lng]
export const CITIES = [
  { city: "Ilorin", state: "Kwara", center: [8.4966, 4.5421] },
  { city: "Lagos", state: "Lagos", center: [6.4550, 3.3941] },
  { city: "Ibadan", state: "Oyo", center: [7.3775, 3.9470] },
] as const;