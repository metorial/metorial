import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEntry,
  deleteEntry,
  deleteMedia,
  downloadMedia,
  getCurrentUser,
  getEntry,
  getFileUrl,
  getMedia,
  getSingleType,
  listEntries,
  listMedia,
  updateEntry,
  updateMedia,
  updateSingleType,
  uploadMedia
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    getSingleType,
    updateSingleType,
    listMedia,
    getMedia,
    uploadMedia,
    updateMedia,
    deleteMedia,
    getCurrentUser,
    downloadMedia,
    getFileUrl
  ],
  triggers: []
});
