import { Slate } from 'slates';
import { spec } from './spec';
import { checkCredits, enrichContacts, getEnrichmentResults, manageWebhook } from './tools';
export let provider = Slate.create({
  spec,
  tools: [enrichContacts, getEnrichmentResults, checkCredits, manageWebhook],
  triggers: []
});
