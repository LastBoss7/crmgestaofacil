import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { SalesMonitor } from '@/components/dashboard/SalesMonitor';
import { Navigate } from 'react-router-dom';

const SalesMonitorPage = () => {
  const { isSeller } = useAuth();

  // Only CEO and Backoffice can access this page
  if (isSeller) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento em Tempo Real</h1>
          <p className="text-muted-foreground">
            Acompanhe o volume de vendas dos call centers em tempo real
          </p>
        </div>
        
        <SalesMonitor />
      </div>
    </Layout>
  );
};

export default SalesMonitorPage;
