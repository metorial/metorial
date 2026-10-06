import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGallery,
  galleryItems,
  getAssetTags,
  listAssets,
  listGalleries,
  manageAsset,
  manageGallery,
  manageLiveStream,
  managePortal,
  uploadMedia
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listGalleries,
    createGallery,
    manageGallery,
    galleryItems,
    listAssets,
    manageAsset,
    getAssetTags,
    uploadMedia,
    managePortal,
    manageLiveStream
  ],
  triggers: []
});
