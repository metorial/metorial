import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichContacts,
  getCreditBalance,
  getEnrichmentResult,
  getReverseEmailResult,
  reverseEmailLookup,
  searchCompanies,
  searchPeople,
  verifyApiKey
} from './tools';
import { enrichmentCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    enrichContacts,
    getEnrichmentResult,
    reverseEmailLookup,
    getReverseEmailResult,
    searchPeople,
    searchCompanies,
    getCreditBalance,
    verifyApiKey
  ],
  triggers: [enrichmentCompleted]
});
