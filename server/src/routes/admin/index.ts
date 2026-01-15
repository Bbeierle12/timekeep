import { Router } from 'express';
import employeeRoutes from './employees';
import entryRoutes from './entries';
import complianceRoutes from './compliance';
import reportRoutes from './reports';
import settingsRoutes from './settings';
import adminRoutes from './admins';
import auditRoutes from './audit';

const router = Router();

router.use('/employees', employeeRoutes);
router.use('/entries', entryRoutes);
router.use('/compliance', complianceRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/admins', adminRoutes);
router.use('/audit-log', auditRoutes);

export default router;
