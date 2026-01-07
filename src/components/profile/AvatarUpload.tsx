import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AvatarUploadProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  gradientColors?: string;
}

const AvatarUpload = ({ className, size = 'md', gradientColors = 'from-violet-500 to-purple-500' }: AvatarUploadProps) => {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao atualizar foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />
      
      <Avatar 
        className={cn(
          sizeClasses[size],
          "border-2 border-white/10 cursor-pointer transition-all duration-200 group-hover:border-violet-500/50"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <AvatarImage src={avatarUrl || undefined} alt={profile?.nome || 'Avatar'} />
        <AvatarFallback className={cn("bg-gradient-to-br text-white font-semibold", gradientColors, size === 'lg' ? 'text-xl' : 'text-sm')}>
          {profile?.nome ? getInitials(profile.nome) : 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Overlay */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
          uploading && "opacity-100"
        )}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className={cn("animate-spin text-white", size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} />
        ) : (
          <Camera className={cn("text-white", size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} />
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;
