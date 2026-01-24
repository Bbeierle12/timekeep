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

const router = Router();

router.use('/v1', v1Routes);
router.use('/auth', authRoutes);
router.use('/', employeeRoutes);
router.use('/punch', punchRoutes);
router.use('/waiver', waiverRoutes);
router.use('/attestation', attestationRoutes);
router.use('/certify', certificationRoutes);
router.use('/push-tokens', pushTokenRoutes);
router.use('/admin', adminRoutes);

export default router;
