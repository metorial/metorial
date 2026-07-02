import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCollection,
  createNote,
  deleteCollection,
  deleteNote,
  getCollection,
  getNote,
  listCollections,
  listNotes,
  memIt,
  searchCollections,
  searchNotes
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    createNote,
    getNote,
    listNotes,
    searchNotes,
    deleteNote,
    createCollection,
    getCollection,
    listCollections,
    searchCollections,
    deleteCollection,
    memIt
  ],
  triggers: [inboundWebhook]
});
