import { Slate } from 'slates';
import { spec } from './spec';
import { checkCredits, enrichCompany, enrichContact, getEnrichmentResult } from './tools';
export let provider = Slate.create({
  spec,
  tools: [enrichContact, getEnrichmentResult, enrichCompany, checkCredits],
  triggers: []
});
