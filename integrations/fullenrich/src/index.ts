import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichContacts,
  getCreditBalance,
  getEnrichmentResult,
  getReverseEmailResult,
  lookupCompany,
  lookupPerson,
  reverseEmailLookup,
  searchCompanies,
  searchPeople,
  verifyApiKey
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    enrichContacts,
    getEnrichmentResult,
    reverseEmailLookup,
    getReverseEmailResult,
    searchPeople,
    searchCompanies,
    lookupPerson,
    lookupCompany,
    getCreditBalance,
    verifyApiKey
  ],
  triggers: []
});
