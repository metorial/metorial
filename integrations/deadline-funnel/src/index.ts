import { Slate } from 'slates';
import { spec } from './spec';
import { createCustomEvent, listCampaigns, startDeadline, trackPurchase } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listCampaigns, startDeadline, trackPurchase, createCustomEvent],
  triggers: []
});
