import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveTinyUrl,
  countTinyUrls,
  createTinyUrl,
  deleteTinyUrl,
  getAnalytics,
  getTinyUrl,
  listTinyUrls,
  updateTinyUrl
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createTinyUrl,
    getTinyUrl,
    listTinyUrls,
    countTinyUrls,
    updateTinyUrl,
    deleteTinyUrl,
    archiveTinyUrl,
    getAnalytics
  ],
  triggers: []
});
