import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  keywords?: string;
  badge?: string;
  badgeVariant?: "danger" | "warning" | "success" | "neutral";
}

const badgeVariantClass: Record<NonNullable<SearchableSelectOption["badgeVariant"]>, string> = {
  danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
};

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  popoverClassName?: string;
  disabled?: boolean;
  usePortal?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Pilih data...",
  searchPlaceholder = "Cari...",
  emptyText = "Data tidak ditemukan.",
  className,
  popoverClassName,
  disabled = false,
  usePortal = true,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-between rounded-none border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs font-normal shadow-none hover:bg-neutral-50 dark:hover:bg-neutral-900",
            !selected && "text-neutral-500",
            className
          )}
        >
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
            <span className="truncate text-left">{selected ? selected.label : placeholder}</span>
            {selected?.badge && (
              <span
                className={cn(
                  "shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 border",
                  badgeVariantClass[selected.badgeVariant || "neutral"]
                )}
              >
                {selected.badge}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        usePortal={usePortal}
        className={cn(
          "w-[--radix-popover-trigger-width] min-w-[260px] p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-md",
          popoverClassName
        )}
      >
        <Command className="rounded-none">
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandList className="max-h-64">
            <CommandEmpty className="py-4 text-center text-xs text-neutral-500">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.sublabel || ""} ${opt.keywords || ""}`}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    className="text-xs rounded-none cursor-pointer py-1.5"
                  >
                    <Check
                      className={cn(
                        "mr-2 size-3.5 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={cn(
                              "shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 border",
                              badgeVariantClass[opt.badgeVariant || "neutral"]
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <div className="truncate text-[10px] font-mono text-neutral-400">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
