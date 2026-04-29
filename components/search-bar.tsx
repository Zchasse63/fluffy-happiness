"use client";

/*
 * URL-driven search input. Updates `?q=…` (or a custom param) on the
 * current path with a 300 ms debounce. Sister page components read the
 * param off `searchParams` and pass it into their data loader for an
 * ILIKE filter — no client-side fetching, the URL is the state.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "./icon";

export function SearchBar({
  placeholder,
  paramName = "q",
  debounceMs = 300,
}: {
  placeholder: string;
  paramName?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest searchParams snapshot — read at flush time so a debounced
  // write doesn't clobber another filter that landed mid-debounce.
  const paramsRef = useRef(searchParams);
  // Last value we wrote to the URL — lets us distinguish our own write
  // from an external nav (back/forward, Link click) when syncing state.
  const lastFlushedRef = useRef(urlValue);

  useEffect(() => {
    paramsRef.current = searchParams;
  }, [searchParams]);

  // Sync from URL only when the change came from outside this component.
  // Without this guard, fast typing visually snaps back to the previous
  // flushed value for ~300 ms before the next debounce fires.
  useEffect(() => {
    if (urlValue !== lastFlushedRef.current) {
      lastFlushedRef.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  const flush = useCallback(
    (next: string) => {
      lastFlushedRef.current = next;
      const params = new URLSearchParams(paramsRef.current.toString());
      if (next) params.set(paramName, next);
      else params.delete(paramName);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [paramName, pathname, router],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(next), debounceMs);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (timer.current) clearTimeout(timer.current);
      flush(value);
    } else if (e.key === "Escape" && value) {
      e.preventDefault();
      setValue("");
      if (timer.current) clearTimeout(timer.current);
      flush("");
    }
  }

  return (
    <div
      className="row"
      style={{
        gap: 8,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 9999,
        padding: "6px 12px",
        flex: 1,
      }}
    >
      <Icon name="search" size={14} />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 13,
        }}
      />
    </div>
  );
}
