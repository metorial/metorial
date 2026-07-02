import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveTinyUrl,
  createTinyUrl,
  deleteTinyUrl,
  getAnalytics,
  getTinyUrl,
  listTinyUrls,
  updateTinyUrl
} from './tools';
import { inboundWebhook, newTinyUrl } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTinyUrl,
    getTinyUrl,
    listTinyUrls,
    updateTinyUrl,
    deleteTinyUrl,
    archiveTinyUrl,
    getAnalytics
  ],
  triggers: [inboundWebhook, newTinyUrl]
});
