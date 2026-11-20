import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Switchback",
    short_name: "Switchback",
    description: "Find hiking partners near you or where you're headed.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F3EE",
    theme_color: "#1F4D3A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
