import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; 
import { createClient } from "@/lib/supabase/server";

// Componentes Globais
import InstallPWA from "@/components/InstallPWA";
import { PushManager } from "@/components/PushManager"; 
import GoogleTranslator from "@/components/GoogleTranslator";
import { GlobalUIProvider } from "@/components/providers/GlobalUIProvider"; // <--- NOVO IMPORT

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
    <html lang="es" suppressHydrationWarning={true}>
      <body className={inter.className}>
        
        {/* === SOLUÇÃO ANTI-CRASH DO GOOGLE TRADUTOR === */}
        {/* Esse script intercepta o erro de removeChild e impede a tela branca */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof Node === 'function' && Node.prototype) {
                const originalRemoveChild = Node.prototype.removeChild;
                Node.prototype.removeChild = function(child) {
                  if (child.parentNode !== this) {
                    if (console) console.warn('Google Translate Crash Prevented: removeChild ignored');
                    return child;
                  }
                  return originalRemoveChild.apply(this, arguments);
                }

                const originalInsertBefore = Node.prototype.insertBefore;
                Node.prototype.insertBefore = function(newNode, referenceNode) {
                  if (referenceNode && referenceNode.parentNode !== this) {
                    if (console) console.warn('Google Translate Crash Prevented: insertBefore ignored');
                    if (referenceNode instanceof Node) {
                      return originalInsertBefore.apply(this, [newNode, null]);
                    }
                    return newNode;
                  }
                  return originalInsertBefore.apply(this, arguments);
                }
              }
            `,
          }}
        />

        {/* --- PROVEDOR DE UI GLOBAL (Envolve tudo) --- */}
        <GlobalUIProvider>
            
            {/* Motor de Tradução */}
            <GoogleTranslator />

            {/* Gerenciadores Globais */}
            {user && <PushManager userId={user.id} />}
            
            <InstallPWA />
            
            {children}

        </GlobalUIProvider>
        
      </body>
    </html>
  );
}