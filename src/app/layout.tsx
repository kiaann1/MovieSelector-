import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Figtree,
  Manrope,
  Nunito,
  Orbitron,
  Oswald,
  Playfair_Display,
  Rajdhani,
  Russo_One,
  Source_Sans_3,
  Syne,
  Zen_Maru_Gothic,
} from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

const cinemaDisplay = Cormorant_Garamond({
  variable: "--font-cinema-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const cinemaBody = Figtree({
  variable: "--font-cinema-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const violetDisplay = Syne({
  variable: "--font-violet-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const violetBody = Manrope({
  variable: "--font-violet-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cyberDisplay = Orbitron({
  variable: "--font-cyber-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const cyberBody = Rajdhani({
  variable: "--font-cyber-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const animeDisplay = Zen_Maru_Gothic({
  variable: "--font-anime-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const animeBody = Nunito({
  variable: "--font-anime-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const heroDisplay = Russo_One({
  variable: "--font-hero-display",
  subsets: ["latin"],
  weight: "400",
});

const heroBody = Oswald({
  variable: "--font-hero-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const noirDisplay = Playfair_Display({
  variable: "--font-noir-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const noirBody = Source_Sans_3({
  variable: "--font-noir-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontVars = [
  cinemaDisplay.variable,
  cinemaBody.variable,
  violetDisplay.variable,
  violetBody.variable,
  cyberDisplay.variable,
  cyberBody.variable,
  animeDisplay.variable,
  animeBody.variable,
  heroDisplay.variable,
  heroBody.variable,
  noirDisplay.variable,
  noirBody.variable,
].join(" ");

export const metadata: Metadata = {
  title: "MovieSelector",
  description: "Personal movie & TV watchlist with ratings",
  applicationName: "MovieSelector",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MovieSelector",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07060c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVars} h-full`} data-theme="violet" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
