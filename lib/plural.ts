/**
 * Русское склонение по числу: 1 исполнение, 2 исполнения, 5 исполнений.
 * 11–14 — всегда «много»: 12 исполнений, а не «исполнения».
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
