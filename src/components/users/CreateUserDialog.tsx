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
  role: z.enum(['CEO', 'BACKOFFICE', 'SUPERVISOR', 'SELLER']),
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

    setIsLoading(true);

    try {
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

  // CEO can create all roles, Supervisor can only create SELLER
  const availableRoles: AppRole[] = isCEO 
    ? ['CEO', 'BACKOFFICE', 'SUPERVISOR', 'SELLER'] 
    : ['SELLER'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastrar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Crie uma conta para um novo membro da equipe
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="João"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sobrenome">Sobrenome</Label>
              <Input
                id="sobrenome"
                placeholder="Silva"
                value={formData.sobrenome}
                onChange={(e) => setFormData(prev => ({ ...prev, sobrenome: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao.silva@empresa.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
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
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={isLoading}
                required
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

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select 
              value={formData.role} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as AppRole, teamId: null }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
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

          {/* Team selector - show for BACKOFFICE and SELLER when CEO is creating */}
          {isCEO && (formData.role === 'BACKOFFICE' || formData.role === 'SELLER') && (
            <div className="space-y-2">
              <Label htmlFor="team">Equipe</Label>
              <Select 
                value={formData.teamId || 'none'} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, teamId: v === 'none' ? null : v }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem equipe</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.role === 'BACKOFFICE' && (
                <p className="text-xs text-muted-foreground">
                  O usuário Qualidade só verá vendas desta equipe
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Permissões da função:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {formData.role === 'CEO' && (
                <>
                  <li>• Acesso total ao sistema</li>
                  <li>• Gerenciar usuários e funções</li>
                  <li>• Ver e editar todas as vendas</li>
                </>
              )}
              {formData.role === 'BACKOFFICE' && (
                <>
                  <li>• Ver todas as vendas da empresa</li>
                  <li>• Alterar status e dados de vendas (Qualidade)</li>
                  <li>• Auditar vendas</li>
                </>
              )}
              {formData.role === 'SUPERVISOR' && (
                <>
                  <li>• Gerenciar equipe de vendedores</li>
                  <li>• Ver todas as vendas</li>
                  <li>• Cadastrar vendedores na própria equipe</li>
                  <li>• Enviar feedbacks</li>
                </>
              )}
              {formData.role === 'SELLER' && (
                <>
                  <li>• Cadastrar novas vendas</li>
                  <li>• Ver apenas suas próprias vendas</li>
                  <li>• Acompanhar status das vendas</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
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
