import { Router } from 'express';
import { checkUpdate, downloadUpdateHandler, installUpdateHandler } from '../controllers/update.controller';

const router = Router();

router.get('/check', checkUpdate);
router.post('/download', downloadUpdateHandler);
router.post('/install', installUpdateHandler);

export default router;
