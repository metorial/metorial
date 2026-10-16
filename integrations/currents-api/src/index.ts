import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkApiKey,
  getAvailableFilters,
  getLatestNews,
  getNewsSources,
  getSourceNews,
  listLatestNews,
  searchNews,
  searchNewsV2
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getLatestNews,
    searchNews,
    getNewsSources,
    getSourceNews,
    getAvailableFilters,
    listLatestNews,
    searchNewsV2,
    checkApiKey
  ],
  triggers: []
});
