import Layout from '@/components/layout/Layout';
import { TeamUsersReport } from '@/components/reports/TeamUsersReport';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';

const TeamReport = () => {
  const { isCEO, isSupervisor, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for role to be loaded before checking permissions
    if (!loading && role !== null && !isCEO && !isSupervisor) {
      toast.error('Acesso não autorizado');
      navigate('/dashboard');
    }
  }, [isCEO, isSupervisor, loading, navigate, role]);

  if (loading || role === null || (!isCEO && !isSupervisor)) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Equipes</h1>
          <p className="text-muted-foreground">
            Visualize todos os usuários organizados por equipe e seus respectivos cargos
          </p>
        </div>

        <TeamUsersReport />
      </div>
    </Layout>
  );
};

export default TeamReport;
