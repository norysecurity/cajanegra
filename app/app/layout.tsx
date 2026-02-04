import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import MobileMenu from '@/components/MobileMenu'
import IaraChat from '@/components/IaraChat'
import SmartNotification from '@/components/SmartNotification'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex flex-col md:flex-row relative">

      <AnalyticsTracker />
      
      {/* Pop-up de Vendas Inteligente */}
      <SmartNotification />
      
      {/* Sidebar Desktop */}
      <div className="hidden md:block w-64 shrink-0 z-40">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen relative z-0">
        <Header />

        <main className="flex-1 overflow-y-auto pb-32 md:pb-0 scrollbar-hide">
          {children}
        </main>

        {/* Menu Mobile */}
        <MobileMenu />
      </div>

      {/* Chat IA */}
      <IaraChat />
    </div>
  )
}