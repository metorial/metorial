import { Slate } from 'slates';
import { spec } from './spec';
import {
  clearCache,
  getClearCacheStatus,
  manageDomains,
  manageSitemaps,
  recacheUrls,
  renderPage,
  searchCache,
  setRecacheSpeed,
  submitSitemap
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    recacheUrls,
    searchCache,
    clearCache,
    getClearCacheStatus,
    manageSitemaps,
    manageDomains,
    setRecacheSpeed,
    renderPage,
    submitSitemap
  ],
  triggers: []
});
