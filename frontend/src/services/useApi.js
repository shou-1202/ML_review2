import { useCallback, useEffect, useState } from "react";

/** Fetch once on mount; exposes { data, error, loading, reload }. */
export default function useApi(fetcher) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err) => setState({ data: null, error: err.message, loading: false }));
  }, [fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
