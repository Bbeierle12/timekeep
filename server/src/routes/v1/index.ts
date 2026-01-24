import { Router } from 'express';
import authRoutes from '../auth';
import employeeRoutes from './employees';
import punchRoutes from '../punch';
import waiverRoutes from '../waiver';
import attestationRoutes from '../attestation';
import certificationRoutes from '../certification';
import pushTokenRoutes from '../pushTokens';
import adminRoutes from '../admin';
import settingsRoutes from './settings';
import consentRoutes from './consent';

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/punches', punchRoutes);
router.use('/waivers', waiverRoutes);
router.use('/attestations', attestationRoutes);
router.use('/certifications', certificationRoutes);
router.use('/push-tokens', pushTokenRoutes);
router.use('/settings', settingsRoutes);
router.use('/consent', consentRoutes);
router.use('/admin', adminRoutes);

export default router;
