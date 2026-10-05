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

// Every state capital + other big cities. center = where the map opens [lat, lng].
// To add a city later, add one line here. People add their own areas inside it.
export const CITIES = [
  { city: "Aba", state: "Abia", center: [5.1066, 7.3667] },
  { city: "Abakaliki", state: "Ebonyi", center: [6.3249, 8.1137] },
  { city: "Abeokuta", state: "Ogun", center: [7.1475, 3.3619] },
  { city: "Abuja", state: "FCT", center: [9.0765, 7.3986] },
  { city: "Ado-Ekiti", state: "Ekiti", center: [7.6233, 5.2209] },
  { city: "Akure", state: "Ondo", center: [7.2571, 5.2058] },
  { city: "Asaba", state: "Delta", center: [6.198, 6.7319] },
  { city: "Awka", state: "Anambra", center: [6.2101, 7.0741] },
  { city: "Bauchi", state: "Bauchi", center: [10.3158, 9.8442] },
  { city: "Benin City", state: "Edo", center: [6.335, 5.6037] },
  { city: "Birnin Kebbi", state: "Kebbi", center: [12.4539, 4.1975] },
  { city: "Calabar", state: "Cross River", center: [4.9757, 8.3417] },
  { city: "Damaturu", state: "Yobe", center: [11.747, 11.9608] },
  { city: "Dutse", state: "Jigawa", center: [11.7561, 9.3383] },
  { city: "Enugu", state: "Enugu", center: [6.4584, 7.5464] },
  { city: "Gombe", state: "Gombe", center: [10.2897, 11.1673] },
  { city: "Gusau", state: "Zamfara", center: [12.1628, 6.6614] },
  { city: "Ibadan", state: "Oyo", center: [7.3775, 3.947] },
  { city: "Ifo", state: "Ogun", center: [6.8167, 3.195] },
  { city: "Ijebu-Ode", state: "Ogun", center: [6.8205, 3.9173] },
  { city: "Ilorin", state: "Kwara", center: [8.4966, 4.5421] },
  { city: "Jalingo", state: "Taraba", center: [8.8937, 11.36] },
  { city: "Jos", state: "Plateau", center: [9.8965, 8.8583] },
  { city: "Kaduna", state: "Kaduna", center: [10.5105, 7.4165] },
  { city: "Kano", state: "Kano", center: [12.0022, 8.592] },
  { city: "Katsina", state: "Katsina", center: [12.9908, 7.6018] },
  { city: "Lafia", state: "Nasarawa", center: [8.4939, 8.515] },
  { city: "Lagos", state: "Lagos", center: [6.455, 3.3941] },
  { city: "Lokoja", state: "Kogi", center: [7.8023, 6.7333] },
  { city: "Maiduguri", state: "Borno", center: [11.8311, 13.151] },
  { city: "Makurdi", state: "Benue", center: [7.7322, 8.5391] },
  { city: "Minna", state: "Niger", center: [9.6139, 6.5569] },
  { city: "Nnewi", state: "Anambra", center: [6.0177, 6.9174] },
  { city: "Ogbomoso", state: "Oyo", center: [8.1335, 4.2407] },
  { city: "Offa", state: "Kwara", center: [8.1491, 4.7207] },
  { city: "Onitsha", state: "Anambra", center: [6.145, 6.7883] },
  { city: "Osogbo", state: "Osun", center: [7.7827, 4.5418] },
  { city: "Ota", state: "Ogun", center: [6.6804, 3.2356] },
  { city: "Owerri", state: "Imo", center: [5.4836, 7.0333] },
  { city: "Port Harcourt", state: "Rivers", center: [4.8156, 7.0498] },
  { city: "Sagamu", state: "Ogun", center: [6.8322, 3.6319] },
  { city: "Sokoto", state: "Sokoto", center: [13.0059, 5.2476] },
  { city: "Umuahia", state: "Abia", center: [5.525, 7.4922] },
  { city: "Uyo", state: "Akwa Ibom", center: [5.0377, 7.9128] },
  { city: "Warri", state: "Delta", center: [5.5544, 5.7932] },
  { city: "Yenagoa", state: "Bayelsa", center: [4.9267, 6.2676] },
  { city: "Yola", state: "Adamawa", center: [9.2035, 12.4954] },
  { city: "Zaria", state: "Kaduna", center: [11.0855, 7.7199] },
] as const;

// Shown first in the city menu (most users so far)
export const POPULAR_CITIES = ["Ilorin", "Lagos", "Ibadan", "Abuja", "Port Harcourt"] as const;