import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; 
import { createClient } from "@/lib/supabase/server";

// Componentes Globais
import InstallPWA from "@/components/InstallPWA";
import { PushManager } from "@/components/PushManager"; 
import GoogleTranslator from "@/components/GoogleTranslator";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: "CAJA NEGRA",
  description: "Plataforma de Ensino Premium",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    // --- AQUI ESTÁ A CORREÇÃO ---
    // suppressHydrationWarning={true} impede que o React quebre quando
    // o Google Tradutor ou extensões modificam o HTML (head/body)
    <html lang="es" suppressHydrationWarning={true}>
      <body className={inter.className}>
        
        {/* Motor de Tradução */}
        <GoogleTranslator />

        {/* Gerenciadores Globais */}
        {user && <PushManager userId={user.id} />}
        
        <InstallPWA />
        
        {children}
        
      </body>
    </html>
  );
}