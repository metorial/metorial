import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEntry,
  deleteEntry,
  deleteMedia,
  getEntry,
  getMedia,
  getSingleType,
  listEntries,
  listMedia,
  updateEntry,
  updateMedia,
  updateSingleType,
  uploadMedia
} from './tools';
import { entryEvents, mediaEvents } from './triggers';

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
    deleteMedia
  ],
  triggers: [entryEvents, mediaEvents]
});
