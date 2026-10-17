/**
 * Inline SVG icon set (24x24, stroke based). Icons are written as static
 * markup strings, so no icon font or network request is needed.
 */
const ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  erase:
    '<path d="M9 4h11v16H9L3 12z"/><path d="m12 9.5 4 5"/><path d="m16 9.5-4 5"/>',
  pencil:
    '<path d="m12 20h9"/><path d="M16.6 3.4a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  bulb:
    '<path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/><path d="M10 19h4"/><path d="M11 22h2"/>',
  pause: '<path d="M8 4h3v16H8z"/><path d="M13 4h3v16h-3z"/>',
  play: '<path d="M7 4l12 8-12 8z"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  share:
    '<path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
  chart: '<path d="M4 20h16"/><path d="M7 20V11"/><path d="M12 20V4"/><path d="M17 20v-6"/>',
  sliders:
    '<path d="M5 21v-5"/><path d="M5 12V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M19 21v-3"/><path d="M19 14V3"/><circle cx="5" cy="14" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="19" cy="16" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6"/><path d="M12 16v4"/>',
  close: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v2a3 3 0 0 0 3 3"/><path d="M16 6h3v2a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M9 21h6"/><path d="M10 17h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** Creates an SVG element for an icon. */
export function icon(name: IconName, size = 20): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ICONS[name];
  return svg;
}
