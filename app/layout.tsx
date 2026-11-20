import type { Metadata } from "next";
import "./globals.css";
import VerificarPerfilModal from "./VerificarPerfilModal";

export const metadata: Metadata = {
  title: "Hyuneatelier",
  description: "Tienda de photocards, merch oficial y Group Orders",
  manifest: "/manifest.json",
  themeColor: "#DB2777",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hyuneatelier",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-[#FFF0F4] bg-[linear-gradient(to_right,rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:30px_30px] text-zinc-700">
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-12 sm:pt-7">
          {children}
        </main>
        <VerificarPerfilModal />
      </body>
    </html>
  );
}
