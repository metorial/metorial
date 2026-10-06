import { Slate } from 'slates';
import { spec } from './spec';
import { deleteLink, editLink, getLinkAnalytics, shortenUrl } from './tools';

export let provider = Slate.create({
  spec,
  tools: [shortenUrl, editLink, getLinkAnalytics, deleteLink],
  triggers: []
});
