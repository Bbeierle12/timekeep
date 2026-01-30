import { Router } from 'express';
import authRoutes from './auth';
import v1Routes from './v1';
import employeeRoutes from './employee';
import punchRoutes from './punch';
import waiverRoutes from './waiver';
import attestationRoutes from './attestation';
import certificationRoutes from './certification';
import pushTokenRoutes from './pushTokens';
import adminRoutes from './admin';
import { deprecateEndpoint } from '../middleware/deprecation';

const router = Router();

// Versioned API (canonical) - no deprecation
router.use('/v1', v1Routes);

// Legacy non-versioned routes - deprecated, use /api/v1/* instead
// These will be removed in a future release
const deprecation = deprecateEndpoint();
router.use('/auth', deprecation, authRoutes);
router.use('/', deprecation, employeeRoutes);
router.use('/punch', deprecation, punchRoutes);
router.use('/waiver', deprecation, waiverRoutes);
router.use('/attestation', deprecation, attestationRoutes);
router.use('/certify', deprecation, certificationRoutes);
router.use('/push-tokens', deprecation, pushTokenRoutes);
router.use('/admin', deprecation, adminRoutes);

export default router;
