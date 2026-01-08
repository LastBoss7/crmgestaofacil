import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { StatusSelector } from '@/components/operator/StatusSelector';
import { useAuth } from '@/hooks/useAuth';
import { usePauseAlerts } from '@/hooks/usePauseAlerts';
import { BroadcastBanner } from '@/components/broadcast/BroadcastBanner';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isSeller, isCEO, isBackoffice } = useAuth();
  
  // Enable pause alerts for managers
  usePauseAlerts({
    maxPauseMinutes: 15,
    maxLunchMinutes: 60,
    checkIntervalMs: 60000, // Check every minute
  });
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Status bar for sellers */}
        {isSeller && (
          <div className="sticky top-0 z-10 flex items-center justify-end p-2 bg-background/95 backdrop-blur border-b">
            <StatusSelector />
          </div>
        )}
        <div className="p-4 lg:p-6">
          <BroadcastBanner />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
