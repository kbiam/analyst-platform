"use client";

import { cn } from "../../lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex border-b border-border",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === tab.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}
