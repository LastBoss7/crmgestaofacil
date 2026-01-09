import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useSuperAdmin = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('is_super_admin', { _user_id: user.id });

      if (!error && data === true) {
        setIsSuperAdmin(true);
      } else {
        setIsSuperAdmin(false);
      }
      setLoading(false);
    };

    checkSuperAdmin();
  }, [user]);

  return { isSuperAdmin, loading };
};
