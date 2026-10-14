import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkCredits,
  enrichCompanyProfile,
  enrichContacts,
  enrichLeadProfile,
  getEnrichmentResults
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    enrichContacts,
    getEnrichmentResults,
    checkCredits,
    enrichLeadProfile,
    enrichCompanyProfile
  ],
  triggers: []
});
