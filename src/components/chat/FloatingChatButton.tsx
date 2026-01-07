import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChatPanel } from './ChatPanel';

export const FloatingChatButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 bg-primary hover:bg-primary/90 hover:scale-105"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[420px] p-0 border-l border-border/50 bg-background/95 backdrop-blur-xl"
        >
          <SheetHeader className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2.5 text-foreground font-semibold">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                Chat da Equipe
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="h-[calc(100vh-60px)] overflow-hidden">
            <ChatPanel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
