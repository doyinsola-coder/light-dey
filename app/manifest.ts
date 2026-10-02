import type { MetadataRoute } from "next";

// Lets people "Add to Home Screen". On iPhone, that's required for alerts to work.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Light Dey?",
    short_name: "Light Dey",
    description: "Does light dey your area? Live power reports from your neighbours.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E1014",
    theme_color: "#0E1014",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}