export function isShortLunch(minutes: number, minimum = 30) {
  return minutes < minimum;
}
