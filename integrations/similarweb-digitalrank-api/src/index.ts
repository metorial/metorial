import { Slate } from 'slates';
import { spec } from './spec';
import { getCapabilities, getRemainingCredits, getTopWebsites, getWebsiteRank } from './tools';

export let provider = Slate.create({
  spec,
  tools: [getWebsiteRank, getTopWebsites, getRemainingCredits, getCapabilities],
  triggers: []
});
