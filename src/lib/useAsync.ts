import { useEffect, useRef, useState } from "react";

// Tiny query hook with a module-level promise cache: dedupes requests, survives
// navigation, and plays nicely with React StrictMode double-invoke.
const cache = new Map<string, Promise<unknown>>();

export function prime<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fn().catch((e) => {
      cache.delete(key); // allow retry on failure
      throw e;
    });
    cache.set(key, p);
  }
  return p;
}

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
}

export function useAsync<T>(key: string | null, fn: () => Promise<T>): AsyncState<T> {
  const [, force] = useState(0);
  const state = useRef<AsyncState<T>>({ data: undefined, loading: !!key, error: undefined, reload: () => {} });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!key) {
      state.current = { ...state.current, loading: false };
      return;
    }
    let alive = true;
    state.current = { ...state.current, loading: true, error: undefined };
    force((n) => n + 1);
    prime(key, fnRef.current)
      .then((d) => {
        if (!alive) return;
        state.current = { data: d, loading: false, error: undefined, reload: state.current.reload };
        force((n) => n + 1);
      })
      .catch((e: Error) => {
        if (!alive) return;
        state.current = { data: undefined, loading: false, error: e, reload: state.current.reload };
        force((n) => n + 1);
      });
    return () => {
      alive = false;
    };
  }, [key]);

  state.current.reload = () => {
    if (key) cache.delete(key);
    force((n) => n + 1);
  };
  return state.current;
}
