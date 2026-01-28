import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder = 'Selecionar...',
  title = 'Filtrar',
  icon,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  const isAllSelected = selected.length === options.length;
  const isNoneSelected = selected.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between min-w-[180px]', className)}
        >
          <div className="flex items-center gap-2 truncate">
            {icon}
            {isNoneSelected ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : isAllSelected ? (
              <span>Todos selecionados</span>
            ) : selected.length === 1 ? (
              <span className="truncate">{selectedLabels[0]}</span>
            ) : (
              <span>{selected.length} selecionados</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isNoneSelected && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-xs"
              >
                {selected.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-popover" align="start">
        <div className="p-3 border-b">
          <p className="font-medium text-sm">{title}</p>
        </div>
        
        <div className="p-2 border-b flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleSelectAll}
          >
            {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          {!isNoneSelected && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'bg-accent/50'
                  )}
                  onClick={() => handleToggle(option.value)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(option.value)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm flex-1">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {!isNoneSelected && (
          <>
            <Separator />
            <div className="p-2">
              <p className="text-xs text-muted-foreground text-center">
                {selected.length} de {options.length} selecionados
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
