import { createContext, useContext, useState } from "react";

/**
 * Selected observation date and transition interval, shared by the U4 hero
 * timeline and the Observations / Transitions stages, so choosing a date or an
 * interval anywhere updates the corresponding visualisation.
 */
export const MarkovSelection = createContext(null);

export function useMarkovSelection(defaults = {}) {
  const ctx = useContext(MarkovSelection);
  const [date, setDate] = useState(defaults.date ?? null);
  const [interval, setInterval] = useState(defaults.interval ?? 0);
  return ctx || { date, setDate, interval, setInterval };
}
