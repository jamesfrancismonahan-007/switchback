import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Switchback: find hiking partners",
  description: "Match with people who want to do the same hikes, at the same level, at the same time.",
  appleWebApp: { capable: true, title: "Switchback", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1F4D3A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-[15px]">
        <AppProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-sand">{children}</div>
        </AppProvider>
      </body>
    </html>
  );
}
