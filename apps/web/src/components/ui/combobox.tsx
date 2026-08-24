"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  badge?: React.ReactNode;
  color?: string;
  description?: string;
  keywords?: string[];
  hideLabel?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  popoverClassName?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ditemukan.",
  disabled = false,
  className,
  popoverClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const id = React.useId();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? `${id}-list` : undefined}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border bg-background px-3 text-xs outline-none transition-colors",
            "hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption ? (
              <>
                {selectedOption.badge}
                {selectedOption.color && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedOption.color }}
                  />
                )}
                {!selectedOption.hideLabel && (
                  <span className="truncate">{selectedOption.label}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className={cn(
            "z-[100] w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[340px] rounded-xl border border-border bg-background p-1 text-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95",
            popoverClassName,
          )}
        >
          <Command
            className="flex flex-col"
            filter={(itemValue, search) => {
              const opt = options.find((o) => o.value === itemValue);
              if (!opt) return 0;
              const text = [
                opt.label,
                opt.value,
                opt.description ?? "",
                ...(opt.keywords ?? []),
              ]
                .join(" ")
                .toLowerCase();
              return text.includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <div className="flex items-center border-b border-border px-2 pb-1.5 pt-1">
              <Command.Input
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-60 overflow-y-auto overflow-x-hidden p-1">
              <Command.Empty className="py-4 text-center text-xs text-muted-foreground">
                {emptyText}
              </Command.Empty>
              <Command.Group>
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <Command.Item
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-xs outline-none transition-colors",
                        "hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground",
                        isSelected && "font-medium bg-muted/60",
                      )}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isSelected ? "opacity-100 text-primary" : "opacity-0",
                        )}
                      />
                      {option.badge}
                      {option.color && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      {!option.hideLabel && (
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate">{option.label}</span>
                          {option.description && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {option.description}
                            </span>
                          )}
                        </div>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
