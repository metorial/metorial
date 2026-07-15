import { Slate } from 'slates';
import { spec } from './spec';
import {
  addAlbumEnrichment,
  createAlbum,
  createPickerSession,
  deletePickerSession,
  downloadMediaItem,
  getAlbum,
  getMediaItem,
  getPickerSession,
  listAlbums,
  listPickedMedia,
  manageAlbumMedia,
  searchMediaItems,
  updateAlbum,
  updateMediaItem,
  uploadMedia
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listAlbums,
    getAlbum,
    createAlbum,
    updateAlbum,
    manageAlbumMedia,
    addAlbumEnrichment,
    getMediaItem,
    downloadMediaItem,
    searchMediaItems,
    updateMediaItem,
    uploadMedia,
    createPickerSession,
    getPickerSession,
    listPickedMedia,
    deletePickerSession
  ],
  triggers: [inboundWebhook]
});
