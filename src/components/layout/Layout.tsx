import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background p-2 gap-2">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-card rounded-2xl lg:rounded-3xl border border-border">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
