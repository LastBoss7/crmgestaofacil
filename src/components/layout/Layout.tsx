import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Ambient glow effect */}
        <div className="fixed top-0 left-72 right-0 h-96 bg-gradient-to-b from-violet-500/[0.03] to-transparent pointer-events-none" />
        <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-radial from-purple-500/[0.05] to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
