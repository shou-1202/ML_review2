/**
 * One place for the three surface classes, so every chart, swatch and table
 * uses the same class → colour mapping as the notebooks' classified maps.
 *
 *  map   exact colour used in the notebook figures (and therefore the map images)
 *  ui    the same hue tuned for lines/marks on the light page background
 *  dark  the same hue lifted for use on midnight/navy panels
 */
export const CLASSES = [
  { name: "Glacier", code: 1, short: "Glacier", map: "#A9A9A9", ui: "#8A9095", dark: "#C3C9CF" },
  { name: "Glacial Lake", code: 2, short: "Lake", map: "#0074D9", ui: "#1F78C8", dark: "#55B9E8" },
  { name: "Non-Glacier Land", code: 3, short: "Land", map: "#8B4513", ui: "#A0582A", dark: "#D08A5A" },
];

const BY_NAME = Object.fromEntries(CLASSES.map((c) => [c.name, c]));

export function classColor(name, kind = "ui") {
  return BY_NAME[name]?.[kind] ?? "#8398A9";
}

export function classShort(name) {
  return BY_NAME[name]?.short ?? name;
}

export function classCode(name) {
  return BY_NAME[name]?.code;
}
