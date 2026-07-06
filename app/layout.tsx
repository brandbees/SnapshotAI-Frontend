import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BrandBees SnapshotAI",
  description: "Agency site monitoring and reporting dashboard",
  icons: {
    icon: [{ url: "/Brandbees-sas-x512.png", type: "image/png" }],
    shortcut: "/Brandbees-sas-x512.png",
    apple: [{ url: "/Brandbees-sas-x512.png", sizes: "512x512" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Sets --accent from localStorage BEFORE React hydrates — eliminates color flash.
            strategy="beforeInteractive" injects this into the raw HTML <head> server-side. */}
        <Script
          id="branding-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `
            try {
              var b = JSON.parse(localStorage.getItem('bb_branding') || 'null');
              if (b && b.accent_color) {
                var hex = b.accent_color;
                var root = document.documentElement.style;
                root.setProperty('--accent', hex);
                root.setProperty('--accent-hover', 'color-mix(in srgb, ' + hex + ' 82%, black)');
                root.setProperty('--accent-light', 'color-mix(in srgb, ' + hex + ' 12%, white)');
                root.setProperty('--accent-deep', 'color-mix(in srgb, ' + hex + ' 55%, black)');
                root.setProperty('--gradient-brand', 'linear-gradient(135deg, color-mix(in srgb, ' + hex + ' 85%, white) 0%, ' + hex + ' 45%, color-mix(in srgb, ' + hex + ' 55%, black) 100%)');
                var m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
                if (m) {
                  var n = parseInt(m[1], 16);
                  root.setProperty('--accent-rgb', ((n>>16)&255) + ', ' + ((n>>8)&255) + ', ' + (n&255));
                }
              }
            } catch(e) {}
          `}}
        />
        {children}
        <ConfirmDialog />
        <Toaster
          position="top-center"
          richColors
          expand={false}
          duration={4500}
          toastOptions={{
            style: {
              fontFamily: "inherit",
              fontSize: "13px",
              borderRadius: "12px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            },
          }}
        />
      </body>
    </html>
  );
}
