import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

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

/** Runtime Google Fonts — avoids next/font/google Turbopack flake (extensionless /l/font URLs). */
const THEME_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Syne:wght@500;600;700;800",
    "family=Manrope:wght@400;500;600;700",
    "family=Cormorant+Garamond:wght@500;600;700",
    "family=Figtree:wght@400;500;600;700",
    "family=Orbitron:wght@500;600;700",
    "family=Rajdhani:wght@400;500;600;700",
    "family=Zen+Maru+Gothic:wght@500;700",
    "family=Nunito:wght@400;500;600;700",
    "family=Russo+One",
    "family=Oswald:wght@400;500;600",
    "family=Playfair+Display:wght@500;600;700",
    "family=Source+Sans+3:wght@400;500;600;700",
  ].join("&") +
  "&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme="violet" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={THEME_FONTS_HREF} />
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
