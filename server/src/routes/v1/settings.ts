import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireEmployee } from '../../middleware/employeeAuth';
import { geofenceService } from '../../services/geofence.service';

const router = Router();

router.get('/geofence', requireAuth, requireEmployee, async (_req, res) => {
  const config = await geofenceService.getConfig();
  const locations = config.latitude !== null && config.longitude !== null
    ? [{
        id: 'company',
        name: 'Company Location',
        latitude: config.latitude,
        longitude: config.longitude,
        radius_meters: config.radiusMeters
      }]
    : [];

  res.json({
    status: 'success',
    data: {
      enabled: config.enabled,
      mode: config.enforcement.toLowerCase(),
      locations
    }
  });
});

export default router;
