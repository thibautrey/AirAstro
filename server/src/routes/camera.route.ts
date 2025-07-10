import { Router } from 'express';
import {
  getCameras,
  selectCamera,
  getCameraStatus,
  updateParameters,
  startCapture,
  cancelCapture,
  setCooling,
  getImageHistory,
  deleteImage
} from '../controllers/camera.controller';

const router = Router();

// Routes pour la gestion des caméras
router.get('/cameras', getCameras);
router.post('/cameras/select', selectCamera);
router.get('/status', getCameraStatus);
router.put('/parameters', updateParameters);

// Routes pour la capture d'images
router.post('/capture', startCapture);
router.delete('/capture', cancelCapture);

// Routes pour le refroidissement
router.post('/cooling', setCooling);

// Routes pour l'historique des images
router.get('/images', getImageHistory);
router.delete('/images/:filename', deleteImage);

export default router;
