import { Slate } from 'slates';
import { spec } from './spec';
import { customSearch, extractContent, queryUrl, screenshot, webSearch } from './tools';

export let provider = Slate.create({
  spec,
  tools: [webSearch, customSearch, queryUrl, extractContent, screenshot],
  triggers: []
});
