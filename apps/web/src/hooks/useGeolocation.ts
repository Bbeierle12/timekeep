import { useState, useCallback } from 'react';

export type GeolocationStatus = 'idle' | 'requesting' | 'success' | 'error' | 'denied' | 'unavailable';

export type GeolocationCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type GeolocationResult = {
  status: GeolocationStatus;
  coords: GeolocationCoords | null;
  error: string | null;
};

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<GeolocationResult> => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by this browser');
      return { status: 'unavailable', coords: null, error: 'Geolocation not supported' };
    }

    setStatus('requesting');
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCoords(newCoords);
          setStatus('success');
          setError(null);
          resolve({ status: 'success', coords: newCoords, error: null });
        },
        (err) => {
          let errorStatus: GeolocationStatus = 'error';
          let errorMessage = err.message;

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorStatus = 'denied';
              errorMessage = 'Location permission denied';
              break;
            case err.POSITION_UNAVAILABLE:
              errorStatus = 'unavailable';
              errorMessage = 'Location information unavailable';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }

          setStatus(errorStatus);
          setError(errorMessage);
          setCoords(null);
          resolve({ status: errorStatus, coords: null, error: errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Cache for 1 minute
        }
      );
    });
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setCoords(null);
    setError(null);
  }, []);

  return {
    status,
    coords,
    error,
    requestLocation,
    reset,
    isRequesting: status === 'requesting',
    isAvailable: 'geolocation' in navigator
  };
}
