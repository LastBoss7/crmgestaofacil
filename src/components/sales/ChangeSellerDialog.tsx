import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserRoundCog, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSaleHistory } from '@/hooks/useSaleHistory';

interface Seller {
  id: string;
  nome: string;
  email: string;
  team_id: string | null;
}

interface ChangeSellerDialogProps {
  saleId: string;
  currentSellerId: string | null;
  currentSellerName?: string;
  onSuccess: () => void;
}

export function ChangeSellerDialog({ 
  saleId, 
  currentSellerId, 
  currentSellerName,
  onSuccess 
}: ChangeSellerDialogProps) {
  const { profile, isCEO } = useAuth();
  const { recordChange } = useSaleHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>(currentSellerId || '');

  // Fetch sellers from the same company
  const fetchSellers = async () => {
    if (!profile?.company_id) return;
    
    setLoadingSellers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, team_id')
        .eq('company_id', profile.company_id)
        .eq('active', true)
        .order('nome');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      toast.error('Erro ao carregar vendedores');
    } finally {
      setLoadingSellers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSellers();
      setSelectedSellerId(currentSellerId || '');
    }
  }, [isOpen, currentSellerId]);

  // Only render for CEO
  if (!isCEO) return null;

  const handleChangeSeller = async () => {
    if (!selectedSellerId || selectedSellerId === currentSellerId) {
      toast.info('Selecione um vendedor diferente');
      return;
    }

    setLoading(true);
    try {
      // Get new seller info
      const newSeller = sellers.find(s => s.id === selectedSellerId);
      if (!newSeller) throw new Error('Vendedor não encontrado');

      // Update sale
      const { error } = await supabase
        .from('sales')
        .update({ seller_id: selectedSellerId })
        .eq('id', saleId);

      if (error) throw error;

      // Record history
      await recordChange(saleId, [{
        field: 'Vendedor Responsável',
        oldValue: currentSellerName || 'Não definido',
        newValue: newSeller.nome,
      }]);

      // Add comment
      if (profile) {
        await supabase.from('sale_comments').insert({
          sale_id: saleId,
          user_id: profile.id,
          user_name: profile.nome,
          user_role: 'CEO',
          message: `Vendedor alterado de "${currentSellerName || 'Não definido'}" para "${newSeller.nome}"`,
          company_id: profile.company_id,
        });
      }

      toast.success('Vendedor alterado com sucesso!');
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error changing seller:', error);
      toast.error('Erro ao alterar vendedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserRoundCog className="h-4 w-4" />
          Trocar Vendedor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar Vendedor Responsável</DialogTitle>
          <DialogDescription>
            Selecione o novo vendedor responsável por esta venda. Esta ação será registrada no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Vendedor Atual</Label>
            <p className="font-medium">{currentSellerName || 'Não definido'}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-seller">Novo Vendedor</Label>
            {loadingSellers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select 
                value={selectedSellerId} 
                onValueChange={setSelectedSellerId}
              >
                <SelectTrigger id="new-seller">
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => (
                    <SelectItem 
                      key={seller.id} 
                      value={seller.id}
                      disabled={seller.id === currentSellerId}
                    >
                      {seller.nome}
                      {seller.id === currentSellerId && ' (atual)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleChangeSeller}
            disabled={loading || !selectedSellerId || selectedSellerId === currentSellerId}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar Alteração
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
