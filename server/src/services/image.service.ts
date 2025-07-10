/**
 * Service for managing captured images.
 * Images can be temporary (plate solving, guiding) or permanent user captures.
 * The implementation will handle storage, retrieval and deletion in the future.
 */

export type ImageType = 'temporary' | 'permanent';

export interface ImageInfo {
  id: string;
  type: ImageType;
  fileName: string;
  createdAt: Date;
}

// In-memory placeholder store
const images: ImageInfo[] = [];

export async function saveImage(info: ImageInfo): Promise<void> {
  images.push(info);
}

export async function listImages(type?: ImageType): Promise<ImageInfo[]> {
  return type ? images.filter(img => img.type === type) : images;
}

export async function getImage(id: string): Promise<ImageInfo | undefined> {
  return images.find(img => img.id === id);
}

export async function deleteImage(id: string): Promise<void> {
  const idx = images.findIndex(img => img.id === id);
  if (idx >= 0) images.splice(idx, 1);
}
