/**
 * Formatting helpers shared by the UI and the controller.
 */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}
