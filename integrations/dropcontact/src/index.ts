import { Slate } from 'slates';
import { spec } from './spec';
import { checkCredits, enrichContacts, getEnrichmentResults, manageWebhook } from './tools';
import { enrichmentResult } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [enrichContacts, getEnrichmentResults, checkCredits, manageWebhook],
  triggers: [enrichmentResult]
});
