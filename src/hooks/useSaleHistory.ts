import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface HistoryChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export const useSaleHistory = () => {
  const { user, profile } = useAuth();

  const recordChange = async (saleId: string, changes: HistoryChange[]) => {
    if (!user || !profile) return;

    const historyEntries = changes.map((change) => ({
      sale_id: saleId,
      field_changed: change.field,
      old_value: change.oldValue,
      new_value: change.newValue,
      changed_by: user.id,
      changed_by_name: profile.nome,
    }));

    const { error } = await supabase.from('sale_history').insert(historyEntries);

    if (error) {
      console.error('Error recording history:', error);
    }
  };

  const recordStatusChange = async (
    saleId: string,
    oldStatus: string | null,
    newStatus: string
  ) => {
    await recordChange(saleId, [
      {
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
      },
    ]);
  };

  return {
    recordChange,
    recordStatusChange,
  };
};
