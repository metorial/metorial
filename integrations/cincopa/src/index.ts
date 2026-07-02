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
import { accountEvents, assetEvents, galleryEvents, leadEvents } from './triggers';

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
  triggers: [assetEvents, galleryEvents, leadEvents, accountEvents]
});
