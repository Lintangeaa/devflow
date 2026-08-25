"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapse: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "devflow:sidebar-collapsed";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsedState(stored === "true");
      }
    } catch {
      // ignore storage access errors
    }
    setMounted(true);
  }, []);

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore storage access errors
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleMobileOpen = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  // Keyboard shortcut: Cmd+B / Ctrl+B
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement | null;
        // Don't intercept when typing in input, textarea, or contenteditable
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleCollapse();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapse]);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed: mounted ? isCollapsed : false,
        setIsCollapsed,
        toggleCollapse,
        isMobileOpen,
        setIsMobileOpen,
        toggleMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
