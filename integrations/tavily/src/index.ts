import { Slate } from 'slates';
import { spec } from './spec';
import {
  crawlWebsite,
  extractContent,
  getResearch,
  getUsage,
  mapWebsite,
  research,
  webSearch
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    webSearch,
    extractContent,
    crawlWebsite,
    mapWebsite,
    research,
    getUsage,
    getResearch
  ],
  triggers: []
});
