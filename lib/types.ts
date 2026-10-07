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

// Towns grouped by state: every state capital plus the other big towns. center = where the map opens [lat, lng].
// To add a city later, add one line here. People add their own areas inside it.
export const CITIES = [
  // Abia State
  { state: "Abia", city: "Aba", center: [5.1066, 7.3667] },
  { state: "Abia", city: "Ohafia", center: [5.6167, 7.8333] },
  { state: "Abia", city: "Umuahia", center: [5.525, 7.4922] },
  // Adamawa State
  { state: "Adamawa", city: "Mubi", center: [10.2676, 13.2645] },
  { state: "Adamawa", city: "Numan", center: [9.4667, 12.0333] },
  { state: "Adamawa", city: "Yola", center: [9.2035, 12.4954] },
  // Akwa Ibom State
  { state: "Akwa Ibom", city: "Eket", center: [4.6423, 7.9244] },
  { state: "Akwa Ibom", city: "Ikot Ekpene", center: [5.1794, 7.7147] },
  { state: "Akwa Ibom", city: "Oron", center: [4.8271, 8.2347] },
  { state: "Akwa Ibom", city: "Uyo", center: [5.0377, 7.9128] },
  // Anambra State
  { state: "Anambra", city: "Awka", center: [6.2101, 7.0741] },
  { state: "Anambra", city: "Ekwulobia", center: [6.0333, 7.0833] },
  { state: "Anambra", city: "Nnewi", center: [6.0177, 6.9174] },
  { state: "Anambra", city: "Onitsha", center: [6.145, 6.7883] },
  // Bauchi State
  { state: "Bauchi", city: "Azare", center: [11.6765, 10.1913] },
  { state: "Bauchi", city: "Bauchi", center: [10.3158, 9.8442] },
  // Bayelsa State
  { state: "Bayelsa", city: "Yenagoa", center: [4.9267, 6.2676] },
  // Benue State
  { state: "Benue", city: "Gboko", center: [7.3253, 9.0019] },
  { state: "Benue", city: "Katsina-Ala", center: [7.1667, 9.2833] },
  { state: "Benue", city: "Makurdi", center: [7.7322, 8.5391] },
  { state: "Benue", city: "Otukpo", center: [7.1904, 8.13] },
  // Borno State
  { state: "Borno", city: "Bama", center: [11.522, 13.6856] },
  { state: "Borno", city: "Biu", center: [10.6111, 12.195] },
  { state: "Borno", city: "Maiduguri", center: [11.8311, 13.151] },
  // Cross River State
  { state: "Cross River", city: "Calabar", center: [4.9757, 8.3417] },
  { state: "Cross River", city: "Ikom", center: [5.9667, 8.7167] },
  { state: "Cross River", city: "Ogoja", center: [6.6584, 8.7992] },
  { state: "Cross River", city: "Ugep", center: [5.8086, 8.0812] },
  // Delta State
  { state: "Delta", city: "Agbor", center: [6.2537, 6.1944] },
  { state: "Delta", city: "Asaba", center: [6.198, 6.7319] },
  { state: "Delta", city: "Sapele", center: [5.8941, 5.6767] },
  { state: "Delta", city: "Ughelli", center: [5.4896, 6.0035] },
  { state: "Delta", city: "Warri", center: [5.5544, 5.7932] },
  // Ebonyi State
  { state: "Ebonyi", city: "Abakaliki", center: [6.3249, 8.1137] },
  { state: "Ebonyi", city: "Afikpo", center: [5.8925, 7.9354] },
  // Edo State
  { state: "Edo", city: "Auchi", center: [7.0667, 6.2667] },
  { state: "Edo", city: "Benin City", center: [6.335, 5.6037] },
  { state: "Edo", city: "Ekpoma", center: [6.7425, 6.1406] },
  { state: "Edo", city: "Uromi", center: [6.7, 6.3333] },
  // Ekiti State
  { state: "Ekiti", city: "Ado-Ekiti", center: [7.6233, 5.2209] },
  { state: "Ekiti", city: "Ikere-Ekiti", center: [7.4991, 5.2319] },
  { state: "Ekiti", city: "Ikole-Ekiti", center: [7.798, 5.514] },
  // Enugu State
  { state: "Enugu", city: "Enugu", center: [6.4584, 7.5464] },
  { state: "Enugu", city: "Nsukka", center: [6.8567, 7.3958] },
  // FCT
  { state: "FCT", city: "Abuja", center: [9.0765, 7.3986] },
  // Gombe State
  { state: "Gombe", city: "Gombe", center: [10.2897, 11.1673] },
  { state: "Gombe", city: "Kumo", center: [10.045, 11.213] },
  // Imo State
  { state: "Imo", city: "Okigwe", center: [5.8292, 7.3503] },
  { state: "Imo", city: "Orlu", center: [5.7957, 7.0351] },
  { state: "Imo", city: "Owerri", center: [5.4836, 7.0333] },
  // Jigawa State
  { state: "Jigawa", city: "Dutse", center: [11.7561, 9.3383] },
  { state: "Jigawa", city: "Gumel", center: [12.627, 9.3882] },
  { state: "Jigawa", city: "Hadejia", center: [12.4498, 10.0444] },
  { state: "Jigawa", city: "Kazaure", center: [12.6519, 8.4115] },
  // Kaduna State
  { state: "Kaduna", city: "Kaduna", center: [10.5105, 7.4165] },
  { state: "Kaduna", city: "Kafanchan", center: [9.5833, 8.2917] },
  { state: "Kaduna", city: "Zaria", center: [11.0855, 7.7199] },
  // Kano State
  { state: "Kano", city: "Kano", center: [12.0022, 8.592] },
  // Katsina State
  { state: "Katsina", city: "Daura", center: [13.0333, 8.3167] },
  { state: "Katsina", city: "Funtua", center: [11.5233, 7.3081] },
  { state: "Katsina", city: "Katsina", center: [12.9908, 7.6018] },
  { state: "Katsina", city: "Malumfashi", center: [11.7833, 7.6167] },
  // Kebbi State
  { state: "Kebbi", city: "Argungu", center: [12.7448, 4.5251] },
  { state: "Kebbi", city: "Birnin Kebbi", center: [12.4539, 4.1975] },
  { state: "Kebbi", city: "Zuru", center: [11.4333, 5.2333] },
  // Kogi State
  { state: "Kogi", city: "Anyigba", center: [7.492, 7.173] },
  { state: "Kogi", city: "Idah", center: [7.1, 6.7333] },
  { state: "Kogi", city: "Kabba", center: [7.8333, 6.0667] },
  { state: "Kogi", city: "Lokoja", center: [7.8023, 6.7333] },
  { state: "Kogi", city: "Okene", center: [7.55, 6.2333] },
  // Kwara State
  { state: "Kwara", city: "Ilorin", center: [8.4966, 4.5421] },
  { state: "Kwara", city: "Jebba", center: [9.1333, 4.8333] },
  { state: "Kwara", city: "Lafiagi", center: [8.85, 5.4167] },
  { state: "Kwara", city: "Offa", center: [8.1491, 4.7207] },
  { state: "Kwara", city: "Omu-Aran", center: [8.1386, 5.1026] },
  { state: "Kwara", city: "Patigi", center: [8.727, 5.756] },
  // Lagos State
  { state: "Lagos", city: "Lagos", center: [6.455, 3.3941] },
  // Nasarawa State
  { state: "Nasarawa", city: "Akwanga", center: [8.91, 8.39] },
  { state: "Nasarawa", city: "Keffi", center: [8.8464, 7.8738] },
  { state: "Nasarawa", city: "Lafia", center: [8.4939, 8.515] },
  // Niger State
  { state: "Niger", city: "Bida", center: [9.0833, 6.0167] },
  { state: "Niger", city: "Kontagora", center: [10.4, 5.4667] },
  { state: "Niger", city: "Minna", center: [9.6139, 6.5569] },
  { state: "Niger", city: "Suleja", center: [9.1806, 7.1794] },
  // Ogun State
  { state: "Ogun", city: "Abeokuta", center: [7.1475, 3.3619] },
  { state: "Ogun", city: "Ifo", center: [6.8167, 3.195] },
  { state: "Ogun", city: "Ijebu-Ode", center: [6.8205, 3.9173] },
  { state: "Ogun", city: "Ilaro", center: [6.8892, 3.0142] },
  { state: "Ogun", city: "Ota", center: [6.6804, 3.2356] },
  { state: "Ogun", city: "Sagamu", center: [6.8322, 3.6319] },
  // Ondo State
  { state: "Ondo", city: "Akure", center: [7.2571, 5.2058] },
  { state: "Ondo", city: "Ikare", center: [7.5167, 5.75] },
  { state: "Ondo", city: "Okitipupa", center: [6.5, 4.7833] },
  { state: "Ondo", city: "Ondo", center: [7.0932, 4.8353] },
  { state: "Ondo", city: "Owo", center: [7.1962, 5.5868] },
  // Osun State
  { state: "Osun", city: "Ede", center: [7.7333, 4.4333] },
  { state: "Osun", city: "Ikirun", center: [7.9167, 4.6667] },
  { state: "Osun", city: "Ile-Ife", center: [7.4824, 4.5603] },
  { state: "Osun", city: "Ilesa", center: [7.6167, 4.7333] },
  { state: "Osun", city: "Iwo", center: [7.6333, 4.1833] },
  { state: "Osun", city: "Osogbo", center: [7.7827, 4.5418] },
  // Oyo State
  { state: "Oyo", city: "Ibadan", center: [7.3775, 3.947] },
  { state: "Oyo", city: "Iseyin", center: [7.9667, 3.6] },
  { state: "Oyo", city: "Ogbomoso", center: [8.1335, 4.2407] },
  { state: "Oyo", city: "Oyo", center: [7.8526, 3.931] },
  { state: "Oyo", city: "Saki", center: [8.6667, 3.3833] },
  // Plateau State
  { state: "Plateau", city: "Jos", center: [9.8965, 8.8583] },
  { state: "Plateau", city: "Pankshin", center: [9.3333, 9.4333] },
  { state: "Plateau", city: "Shendam", center: [8.8833, 9.5333] },
  // Rivers State
  { state: "Rivers", city: "Ahoada", center: [5.0833, 6.65] },
  { state: "Rivers", city: "Bonny", center: [4.45, 7.1667] },
  { state: "Rivers", city: "Port Harcourt", center: [4.8156, 7.0498] },
  // Sokoto State
  { state: "Sokoto", city: "Sokoto", center: [13.0059, 5.2476] },
  // Taraba State
  { state: "Taraba", city: "Jalingo", center: [8.8937, 11.36] },
  { state: "Taraba", city: "Wukari", center: [7.871, 9.778] },
  // Yobe State
  { state: "Yobe", city: "Damaturu", center: [11.747, 11.9608] },
  { state: "Yobe", city: "Gashua", center: [12.871, 11.046] },
  { state: "Yobe", city: "Nguru", center: [12.8792, 10.4526] },
  { state: "Yobe", city: "Potiskum", center: [11.7091, 11.0694] },
  // Zamfara State
  { state: "Zamfara", city: "Gusau", center: [12.1628, 6.6614] },
  { state: "Zamfara", city: "Kaura Namoda", center: [12.5932, 6.5867] },
  { state: "Zamfara", city: "Talata Mafara", center: [12.5667, 6.0667] },
] as const;

// Shown first in the city menu (most users so far)
export const POPULAR_CITIES = ["Ilorin", "Lagos", "Ibadan", "Abuja", "Port Harcourt"] as const;