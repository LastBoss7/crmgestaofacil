import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { ChatPanel } from './ChatPanel';

export const FloatingChatButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Drawer do chat */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="h-[85vh] max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between border-b border-white/10 pb-4">
            <DrawerTitle className="flex items-center gap-2 text-white">
              <MessageCircle className="h-5 w-5 text-violet-400" />
              Chat da Equipe
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden p-4">
            <ChatPanel />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
