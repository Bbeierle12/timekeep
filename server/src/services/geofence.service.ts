import { pool } from '../db/connection';

export type GeofenceConfig = {
  enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  enforcement: 'WARN' | 'BLOCK' | 'LOG';
};

export type GeofenceResult = {
  withinGeofence: boolean;
  distanceMeters: number | null;
  enforcement: 'WARN' | 'BLOCK' | 'LOG';
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const geofenceService = {
  /**
   * Get geofence configuration
   */
  async getConfig(): Promise<GeofenceConfig> {
    const result = await pool.query(
      `SELECT geofence_enabled, geofence_latitude, geofence_longitude,
              geofence_radius_meters, geofence_enforcement
       FROM company_settings WHERE id = 1`
    );

    if (result.rows.length === 0) {
      return {
        enabled: false,
        latitude: null,
        longitude: null,
        radiusMeters: 100,
        enforcement: 'WARN'
      };
    }

    const row = result.rows[0];
    return {
      enabled: row.geofence_enabled ?? false,
      latitude: row.geofence_latitude ? parseFloat(row.geofence_latitude) : null,
      longitude: row.geofence_longitude ? parseFloat(row.geofence_longitude) : null,
      radiusMeters: row.geofence_radius_meters ?? 100,
      enforcement: row.geofence_enforcement ?? 'WARN'
    };
  },

  /**
   * Update geofence configuration
   */
  async updateConfig(config: Partial<GeofenceConfig>): Promise<GeofenceConfig> {
    await pool.query(
      `UPDATE company_settings
       SET geofence_enabled = COALESCE($1, geofence_enabled),
           geofence_latitude = COALESCE($2, geofence_latitude),
           geofence_longitude = COALESCE($3, geofence_longitude),
           geofence_radius_meters = COALESCE($4, geofence_radius_meters),
           geofence_enforcement = COALESCE($5, geofence_enforcement)
       WHERE id = 1`,
      [
        config.enabled,
        config.latitude,
        config.longitude,
        config.radiusMeters,
        config.enforcement
      ]
    );

    return this.getConfig();
  },

  /**
   * Validate coordinates against geofence
   */
  async validateLocation(
    latitude: number | null | undefined,
    longitude: number | null | undefined
  ): Promise<GeofenceResult> {
    const config = await this.getConfig();

    // If geofence is disabled or no location provided, allow
    if (!config.enabled) {
      return {
        withinGeofence: true,
        distanceMeters: null,
        enforcement: config.enforcement
      };
    }

    // If no GPS coordinates provided
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return {
        withinGeofence: false,
        distanceMeters: null,
        enforcement: config.enforcement
      };
    }

    // If geofence center not configured
    if (config.latitude === null || config.longitude === null) {
      return {
        withinGeofence: true,
        distanceMeters: null,
        enforcement: config.enforcement
      };
    }

    // Calculate distance from geofence center
    const distance = calculateDistance(
      latitude,
      longitude,
      config.latitude,
      config.longitude
    );

    const withinGeofence = distance <= config.radiusMeters;

    return {
      withinGeofence,
      distanceMeters: Math.round(distance),
      enforcement: config.enforcement
    };
  },

  /**
   * Check if a punch should be blocked based on geofence
   */
  async shouldBlockPunch(
    latitude: number | null | undefined,
    longitude: number | null | undefined
  ): Promise<{ blocked: boolean; reason?: string; distanceMeters?: number }> {
    const result = await this.validateLocation(latitude, longitude);

    if (result.withinGeofence) {
      return { blocked: false };
    }

    if (result.enforcement === 'BLOCK') {
      return {
        blocked: true,
        reason: `Location is ${result.distanceMeters}m outside the allowed work area`,
        distanceMeters: result.distanceMeters ?? undefined
      };
    }

    // WARN or LOG mode - don't block, just flag
    return { blocked: false };
  },

  /**
   * Get distance in human-readable format
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }
};
