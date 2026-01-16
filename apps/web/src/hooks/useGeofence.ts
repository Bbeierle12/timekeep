import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import { useAuth } from './useAuth';

type Location = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
};

type GeofenceSettings = {
  enabled: boolean;
  mode: 'warn' | 'block' | 'log';
  locations: Location[];
};

type GeofenceCheckResult = {
  isWithinBounds: boolean;
  nearestLocation: Location | null;
  distance: number;
  allowedRadius: number;
};

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function useGeofence() {
  const { token } = useAuth();
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Fetch geofence settings
  const { data: settings } = useQuery({
    queryKey: ['geofence-settings'],
    queryFn: async () => {
      const result = await apiRequest<GeofenceSettings>('/api/settings/geofence', { token: token ?? undefined });
      return result;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getCurrentPosition = useCallback(async (): Promise<GeolocationPosition | null> => {
    setIsGettingLocation(true);
    setPositionError(null);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setPositionError('Geolocation is not supported by your browser');
        setIsGettingLocation(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition(position);
          setIsGettingLocation(false);
          resolve(position);
        },
        (error) => {
          let message = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access was denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          setPositionError(message);
          setIsGettingLocation(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  const checkGeofence = useCallback(
    (position: GeolocationPosition): GeofenceCheckResult => {
      if (!settings?.enabled || !settings?.locations?.length) {
        return {
          isWithinBounds: true,
          nearestLocation: null,
          distance: 0,
          allowedRadius: 0,
        };
      }

      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      let nearestLocation: Location | null = null;
      let shortestDistance = Infinity;

      for (const location of settings.locations) {
        const distance = calculateDistance(
          userLat,
          userLon,
          location.latitude,
          location.longitude
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestLocation = location;
        }

        // Check if within this location's radius
        if (distance <= location.radius_meters) {
          return {
            isWithinBounds: true,
            nearestLocation: location,
            distance: 0,
            allowedRadius: location.radius_meters,
          };
        }
      }

      // Not within any location
      return {
        isWithinBounds: false,
        nearestLocation,
        distance: shortestDistance - (nearestLocation?.radius_meters ?? 0),
        allowedRadius: nearestLocation?.radius_meters ?? 0,
      };
    },
    [settings]
  );

  const validateLocation = useCallback(async (): Promise<{
    valid: boolean;
    position: GeolocationPosition | null;
    checkResult: GeofenceCheckResult | null;
    mode: 'warn' | 'block' | 'log' | null;
  }> => {
    // If geofencing is not enabled, always valid
    if (!settings?.enabled) {
      const position = await getCurrentPosition();
      return {
        valid: true,
        position,
        checkResult: null,
        mode: null,
      };
    }

    const position = await getCurrentPosition();
    if (!position) {
      // If we can't get location and geofencing is enabled, check mode
      if (settings.mode === 'block') {
        return {
          valid: false,
          position: null,
          checkResult: null,
          mode: 'block',
        };
      }
      // For warn/log mode, allow without location
      return {
        valid: true,
        position: null,
        checkResult: null,
        mode: settings.mode,
      };
    }

    const checkResult = checkGeofence(position);

    if (checkResult.isWithinBounds) {
      return {
        valid: true,
        position,
        checkResult,
        mode: null,
      };
    }

    // User is outside bounds
    return {
      valid: settings.mode === 'log', // Only auto-valid for log mode
      position,
      checkResult,
      mode: settings.mode,
    };
  }, [settings, getCurrentPosition, checkGeofence]);

  return {
    settings,
    currentPosition,
    positionError,
    isGettingLocation,
    getCurrentPosition,
    checkGeofence,
    validateLocation,
  };
}
