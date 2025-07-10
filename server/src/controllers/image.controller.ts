import { Request, Response } from 'express';
import { deleteImage, getImage, listImages, saveImage, ImageInfo, ImageType } from '../services/image.service';
import { v4 as uuidv4 } from 'uuid';

export async function createImage(req: Request, res: Response) {
  const info: ImageInfo = {
    id: uuidv4(),
    type: (req.body?.type as ImageType) || 'temporary',
    fileName: req.body?.fileName || 'unknown',
    createdAt: new Date(),
  };
  await saveImage(info);
  res.status(201).json(info);
}

export async function listImagesHandler(req: Request, res: Response) {
  const type = req.query.type as ImageType | undefined;
  const images = await listImages(type);
  res.json(images);
}

export async function getImageHandler(req: Request, res: Response) {
  const id = req.params.id;
  const img = await getImage(id);
  if (!img) return res.status(404).json({ error: 'Not found' });
  res.json(img);
}

export async function deleteImageHandler(req: Request, res: Response) {
  const id = req.params.id;
  await deleteImage(id);
  res.status(204).send();
}
