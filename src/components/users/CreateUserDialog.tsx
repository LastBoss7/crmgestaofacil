import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppRole, ROLE_LABELS } from '@/types/database';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { z } from 'zod';

interface Team {
  id: string;
  name: string;
}

const createUserSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  sobrenome: z.string().trim().min(2, 'Sobrenome deve ter no mínimo 2 caracteres').max(100, 'Sobrenome muito longo'),
  email: z.string().trim().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(50, 'Senha muito longa'),
  role: z.enum(['CEO', 'COORDENADOR', 'BACKOFFICE', 'SUPERVISOR', 'SELLER']),
});

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export const CreateUserDialog = ({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) => {
  const { profile, isCEO, isSupervisor, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    password: '',
    role: 'SELLER' as AppRole,
    teamId: null as string | null,
  });

  // Fetch teams when dialog opens
  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching teams:', error);
    } else {
      setTeams(data || []);
    }
  };

  // Roles that require a team (COORDENADOR doesn't require team - CEO assigns teams separately)
  const rolesRequiringTeam: AppRole[] = ['SUPERVISOR', 'BACKOFFICE', 'SELLER'];
  const requiresTeam = rolesRequiringTeam.includes(formData.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullName = `${formData.nome} ${formData.sobrenome}`.trim();
    
    const result = createUserSchema.safeParse({
      ...formData,
      nome: formData.nome,
      sobrenome: formData.sobrenome,
    });
    
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (!profile?.company_id) {
      toast.error('Você precisa estar vinculado a uma empresa');
      return;
    }

    // Validate team requirement for non-CEO roles
    if (requiresTeam && !formData.teamId) {
      toast.error(`É obrigatório selecionar uma equipe para ${ROLE_LABELS[formData.role]}`);
      return;
    }

    setIsLoading(true);

    try {
      // Store current session to verify it's preserved after user creation
      const currentSession = session;
      
      // Call edge function to create user (doesn't affect current session)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          nome: fullName,
          role: formData.role,
          teamId: formData.teamId,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Erro ao criar usuário: ' + error.message);
        setIsLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      // Verify that session was preserved (edge function shouldn't affect it)
      const { data: { session: currentSessionCheck } } = await supabase.auth.getSession();
      if (!currentSessionCheck || currentSessionCheck.user?.id !== currentSession?.user?.id) {
        console.error('Session was unexpectedly changed after user creation');
        // Attempt to restore session if somehow lost
        if (currentSession) {
          await supabase.auth.setSession(currentSession);
        }
      }

      toast.success(`Usuário ${fullName} criado com sucesso!`);
      
      // Reset form
      setFormData({
        nome: '',
        sobrenome: '',
        email: '',
        password: '',
        role: 'SELLER',
        teamId: null,
      });
      
      onOpenChange(false);
      onUserCreated();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
    toast.success('Senha gerada! Anote antes de salvar.');
  };

  // CEO can create all roles, Coordinator can create SELLER, BACKOFFICE, SUPERVISOR, Supervisor can create SELLER, BACKOFFICE, SUPERVISOR
  const { isCoordinator } = useAuth();
  const availableRoles: AppRole[] = isCEO 
    ? ['CEO', 'COORDENADOR', 'BACKOFFICE', 'SUPERVISOR', 'SELLER'] 
    : (isSupervisor || isCoordinator)
    ? ['SELLER', 'BACKOFFICE', 'SUPERVISOR']
    : ['SELLER'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastrar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Crie uma conta para um novo membro da equipe
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" autoComplete="off">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-sm">Nome</Label>
                <Input
                  id="nome"
                  name="new-user-nome"
                  placeholder="João"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  disabled={isLoading}
                  required
                  autoComplete="off"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sobrenome" className="text-sm">Sobrenome</Label>
                <Input
                  id="sobrenome"
                  name="new-user-sobrenome"
                  placeholder="Silva"
                  value={formData.sobrenome}
                  onChange={(e) => setFormData(prev => ({ ...prev, sobrenome: e.target.value }))}
                  disabled={isLoading}
                  required
                  autoComplete="off"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-user-email" className="text-sm">E-mail</Label>
              <Input
                id="new-user-email"
                name="new-user-email"
                type="email"
                placeholder="joao.silva@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isLoading}
                required
                autoComplete="new-password"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                  onClick={generatePassword}
                >
                  Gerar senha
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="new-user-password"
                  name="new-user-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                  className="h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-sm">Função</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as AppRole, teamId: null }))}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team selector - required for SUPERVISOR, BACKOFFICE and SELLER */}
              {requiresTeam && (
                <div className="space-y-1.5">
                  <Label htmlFor="team" className="text-sm flex items-center gap-1">
                    Equipe
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={formData.teamId || ''} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, teamId: v || null }))}
                    disabled={isLoading}
                    required
                  >
                    <SelectTrigger className={`h-9 ${!formData.teamId ? 'border-destructive/50' : ''}`}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {requiresTeam && (
              <p className="text-xs text-muted-foreground -mt-2">
                {formData.role === 'BACKOFFICE' && 'O usuário Qualidade só verá vendas desta equipe'}
                {formData.role === 'SUPERVISOR' && 'O supervisor gerenciará esta equipe'}
                {formData.role === 'SELLER' && 'O vendedor pertencerá a esta equipe'}
              </p>
            )}

            <div className="rounded-lg border bg-muted/50 p-2.5 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Permissões:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {formData.role === 'CEO' && (
                  <>
                    <li>• Acesso total ao sistema</li>
                    <li>• Gerenciar usuários e funções</li>
                  </>
                )}
                {formData.role === 'COORDENADOR' && (
                  <>
                    <li>• Gerenciar equipes atribuídas pelo CEO</li>
                    <li>• Ver vendas das equipes atribuídas</li>
                  </>
                )}
                {formData.role === 'BACKOFFICE' && (
                  <>
                    <li>• Auditar vendas da equipe</li>
                    <li>• Alterar status de vendas</li>
                  </>
                )}
                {formData.role === 'SUPERVISOR' && (
                  <>
                    <li>• Gerenciar equipe de vendedores</li>
                    <li>• Cadastrar vendedores</li>
                  </>
                )}
                {formData.role === 'SELLER' && (
                  <>
                    <li>• Cadastrar novas vendas</li>
                    <li>• Ver suas próprias vendas</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 flex-shrink-0 border-t mt-4">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
