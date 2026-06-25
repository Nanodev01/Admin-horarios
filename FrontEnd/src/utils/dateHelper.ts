
export function getDayNumber(date: Date): number {
  const day = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  return day === 0 ? 7 : day;
}