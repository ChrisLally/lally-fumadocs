"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Clock3, X } from "lucide-react";

export type SidebarHistoryEntry = {
  key: string;
  url: string;
  label: string;
  visitedAt: number;
};

export type SidebarHistoryLabelContext = {
  heading: string | null;
  pathname: string;
  query: string;
  segments: string[];
  url: string;
};

export type SidebarHistoryBannerProps = {
  storageKey?: string;
  maxHistory?: number;
  defaultVisible?: number;
  className?: string;
  basePath?: string;
  ignorePaths?: string[];
  labelResolver?: (context: SidebarHistoryLabelContext) => string | null;
};

const DEFAULT_STORAGE_KEY = "sidebar-history-v1";
const DEFAULT_MAX_HISTORY = 50;
const DEFAULT_VISIBLE = 4;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizePath(pathname: string, basePath?: string): string {
  if (basePath && pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }

  if (basePath && pathname === basePath) return "/";

  return pathname;
}

function toTitleCase(input: string): string {
  return input
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCurrentPageHeading(): string | null {
  const h1 = document.querySelector("h1");
  const text = h1?.textContent?.trim();
  return text && text.length > 0 ? text : null;
}

function defaultLabelResolver(context: SidebarHistoryLabelContext): string {
  if (context.segments.length === 0) return "Home";

  const hasDynamicSegment = context.segments.some((segment) => UUID_PATTERN.test(segment));

  if (context.heading && hasDynamicSegment) {
    const parent = context.segments[context.segments.length - 2];
    if (parent) {
      return `${toTitleCase(parent)} / ${context.heading}`;
    }

    return context.heading;
  }

  if (context.heading && context.query.includes("_id=")) {
    const parent = context.segments[context.segments.length - 1];
    if (parent) return `${toTitleCase(parent)} / ${context.heading}`;

    return context.heading;
  }

  return context.segments
    .slice(-2)
    .map((segment) => toTitleCase(segment))
    .join(" / ");
}

function readHistory(storageKey: string, maxHistory: number): SidebarHistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SidebarHistoryEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, maxHistory);
  } catch {
    return [];
  }
}

function writeHistory(storageKey: string, entries: SidebarHistoryEntry[], maxHistory: number) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, maxHistory)));
  } catch {
    // Ignore storage write failures.
  }
}

export function SidebarHistoryBanner({
  storageKey = DEFAULT_STORAGE_KEY,
  maxHistory = DEFAULT_MAX_HISTORY,
  defaultVisible = DEFAULT_VISIBLE,
  className,
  basePath,
  ignorePaths,
  labelResolver,
}: SidebarHistoryBannerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<SidebarHistoryEntry[]>([]);
  const [showAll, setShowAll] = useState(false);

  const currentUrl = useMemo(() => {
    const path = normalizePath(pathname, basePath);
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }, [basePath, pathname, searchParams]);

  const isIgnored = useMemo(() => {
    if (!ignorePaths || ignorePaths.length === 0) return false;

    const normalizedPath = normalizePath(pathname, basePath);
    return ignorePaths.some((ignored) => normalizedPath === ignored || normalizedPath.startsWith(`${ignored}/`));
  }, [basePath, ignorePaths, pathname]);

  useEffect(() => {
    if (isIgnored) return;

    const existing = readHistory(storageKey, maxHistory);
    const normalizedPath = normalizePath(pathname, basePath);
    const query = searchParams.toString();
    const segments = normalizedPath.split("/").filter(Boolean);
    const heading = getCurrentPageHeading();

    const context: SidebarHistoryLabelContext = {
      heading,
      pathname: normalizedPath,
      query,
      segments,
      url: currentUrl,
    };

    const resolvedLabel = labelResolver?.(context) ?? defaultLabelResolver(context);

    const nextEntry: SidebarHistoryEntry = {
      key: currentUrl,
      url: currentUrl,
      label: resolvedLabel,
      visitedAt: Date.now(),
    };

    const filtered = existing.filter((entry) => entry.key !== nextEntry.key);
    const next = [nextEntry, ...filtered].slice(0, maxHistory);

    writeHistory(storageKey, next, maxHistory);
    setEntries(next);
  }, [basePath, currentUrl, isIgnored, labelResolver, maxHistory, pathname, searchParams, storageKey]);

  useEffect(() => {
    if (isIgnored) return;

    const timer = window.setTimeout(() => {
      const heading = getCurrentPageHeading();
      if (!heading) return;

      const next = readHistory(storageKey, maxHistory);
      const index = next.findIndex((entry) => entry.key === currentUrl);
      if (index < 0) return;
      const currentEntry = next[index];
      if (!currentEntry) return;

      const normalizedPath = normalizePath(pathname, basePath);
      const query = searchParams.toString();
      const segments = normalizedPath.split("/").filter(Boolean);

      const context: SidebarHistoryLabelContext = {
        heading,
        pathname: normalizedPath,
        query,
        segments,
        url: currentUrl,
      };

      const updatedLabel = labelResolver?.(context) ?? defaultLabelResolver(context);
      if (currentEntry.label === updatedLabel) return;

      next[index] = { ...currentEntry, label: updatedLabel };
      writeHistory(storageKey, next, maxHistory);
      setEntries(next);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [basePath, currentUrl, isIgnored, labelResolver, maxHistory, pathname, searchParams, storageKey]);

  function removeEntry(key: string) {
    const next = entries.filter((entry) => entry.key !== key);
    writeHistory(storageKey, next, maxHistory);
    setEntries(next);
  }

  function clearHistory() {
    writeHistory(storageKey, [], maxHistory);
    setEntries([]);
  }

  if (entries.length === 0) return null;

  const visible = showAll ? entries : entries.slice(0, defaultVisible);
  const hasMore = entries.length > defaultVisible;

  return (
    <div className={className ?? "mb-2 space-y-2 px-1"}>
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 text-xs font-medium text-fd-muted-foreground">
          <Clock3 className="size-3" />
          Recent
        </div>
        <button
          className="text-xs text-fd-muted-foreground hover:text-fd-foreground"
          onClick={clearHistory}
          type="button"
        >
          Clear
        </button>
      </div>

      <div className="space-y-1">
        {visible.map((entry) => (
          <div className="group flex items-center gap-1" key={entry.key}>
            <Link
              className="flex-1 truncate rounded border border-fd-border px-2 py-1 text-xs hover:bg-fd-accent"
              href={entry.url}
              title={entry.url}
            >
              {entry.label}
            </Link>
            <button
              aria-label="Remove history entry"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => removeEntry(entry.key)}
              type="button"
            >
              <X className="size-3 text-fd-muted-foreground hover:text-fd-foreground" />
            </button>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          className="inline-flex items-center gap-1 text-xs text-fd-muted-foreground hover:text-fd-foreground"
          onClick={() => setShowAll((value) => !value)}
          type="button"
        >
          {showAll ? (
            <>
              <ChevronUp className="size-3" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              Show {entries.length - defaultVisible} More
            </>
          )}
        </button>
      )}
    </div>
  );
}
