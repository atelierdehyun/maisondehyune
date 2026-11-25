
import type { Metadata } from "next";
import "./globals.css";
import VerificarPerfilModal from "./VerificarPerfilModal";
import AdminAwareShell from "@/components/AdminAwareShell";

export const metadata: Metadata = {
  title: "Hyuneatelier",
  applicationName: "Hyuneatelier",
  description: "Tienda de photocards, merch oficial y compras grupales de K-pop",
  manifest: "/manifest.json",
  themeColor: "#F8E5F0",

  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hyuneatelier",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-[#FFF0F4] bg-[linear-gradient(to_right,rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:30px_30px] text-zinc-700">
        <AdminAwareShell>{children}</AdminAwareShell>

        <VerificarPerfilModal />
      </body>
    </html>
  );
}
