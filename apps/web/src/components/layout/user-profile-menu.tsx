"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

interface UserProfileMenuProps {
  isCollapsed: boolean;
}

export function UserProfileMenu({ isCollapsed }: UserProfileMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  if (isCollapsed) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary hover:ring-2 hover:ring-primary/40 transition-all focus:outline-none mx-auto text-xs font-semibold"
            title={user?.name || "User Profile"}
          >
            {user?.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="right"
            align="end"
            sideOffset={12}
            className="z-50 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-80"
          >
            <div className="px-2.5 py-2">
              <p className="text-xs font-semibold truncate">{user?.name || "Devflow User"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <div className="px-2.5 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Tema</span>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "rounded p-1 transition-colors",
                    theme === "light" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                  )}
                  title="Light mode"
                >
                  <Sun className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "rounded p-1 transition-colors",
                    theme === "dark" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                  )}
                  title="Dark mode"
                >
                  <Moon className="h-3 w-3" />
                </button>
              </div>
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={handleLogout}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 focus:bg-destructive/10 outline-none transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar (Sign Out)</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group flex w-full items-center justify-between rounded-xl p-2 text-left text-xs transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold text-xs">
              {user?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-8 w-8 rounded-xl object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{user?.name || "Devflow User"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-80"
        >
          <div className="px-2.5 py-2">
            <p className="text-xs font-semibold truncate">{user?.name || "Devflow User"}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <div className="px-2.5 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Tema Tampilan</span>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "rounded p-1 transition-colors",
                  theme === "light" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                )}
                title="Light"
              >
                <Sun className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "rounded p-1 transition-colors",
                  theme === "dark" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                )}
                title="Dark"
              >
                <Moon className="h-3 w-3" />
              </button>
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={handleLogout}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 focus:bg-destructive/10 outline-none transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar (Sign Out)</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
