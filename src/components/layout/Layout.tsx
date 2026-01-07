import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(252,15%,6%)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Hero gradient glow */}
        <div className="fixed top-0 left-[280px] right-0 h-[500px] bg-[radial-gradient(ellipse_at_top,_hsl(262,40%,15%)_0%,_transparent_60%)] pointer-events-none" />
        <div className="fixed top-20 right-20 w-[400px] h-[400px] bg-[radial-gradient(circle,_hsl(262,83%,58%,0.1)_0%,_transparent_60%)] blur-3xl pointer-events-none" />
        
        <div className="relative p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
