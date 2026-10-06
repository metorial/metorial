import { Slate } from 'slates';
import { spec } from './spec';
import { discoverSources, searchArticles, topHeadlines } from './tools';

export let provider = Slate.create({
  spec,
  tools: [searchArticles, topHeadlines, discoverSources],
  triggers: []
});
