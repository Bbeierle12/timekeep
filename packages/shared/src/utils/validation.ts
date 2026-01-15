export function normalizeInitials(value: string) {
  return value.trim().slice(0, 3).toUpperCase();
}
