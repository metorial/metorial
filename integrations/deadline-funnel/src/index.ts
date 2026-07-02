import { Slate } from 'slates';
import { spec } from './spec';
import { createCustomEvent, listCampaigns, startDeadline, trackPurchase } from './tools';
import { inboundWebhook, newCustomEvent, newFormSubmission, newPortal } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listCampaigns, startDeadline, trackPurchase, createCustomEvent],
  triggers: [inboundWebhook, newCustomEvent, newPortal, newFormSubmission]
});
