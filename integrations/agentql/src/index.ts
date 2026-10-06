import { Slate } from 'slates';
import { spec } from './spec';
import { createBrowserSession, getUsage, queryDocument, queryWebPage } from './tools';

export let provider = Slate.create({
  spec,
  tools: [queryWebPage, queryDocument, createBrowserSession, getUsage],
  triggers: []
});
