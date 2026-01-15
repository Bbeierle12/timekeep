export function useGeolocation() {
  return { status: 'idle', coords: null as null | { lat: number; lng: number } };
}
