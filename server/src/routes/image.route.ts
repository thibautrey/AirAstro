import { Router } from 'express';
import { createImage, deleteImageHandler, getImageHandler, listImagesHandler } from '../controllers/image.controller';

const router = Router();

router.post('/', createImage);
router.get('/', listImagesHandler);
router.get('/:id', getImageHandler);
router.delete('/:id', deleteImageHandler);

export default router;
