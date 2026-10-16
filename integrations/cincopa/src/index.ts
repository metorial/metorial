import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGallery,
  downloadGallery,
  galleryItems,
  getAssetTags,
  getCurrentUser,
  importMedia,
  listAssets,
  listGalleries,
  manageAsset,
  manageGallery,
  manageLiveStream,
  managePortal,
  managePortalSubdomain,
  setMediaMetadata,
  uploadMedia
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    setMediaMetadata,
    downloadGallery,
    importMedia,
    managePortalSubdomain,
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
