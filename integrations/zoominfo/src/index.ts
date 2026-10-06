import { Slate } from 'slates';
import { spec } from './spec';
import {
  complianceCheck,
  enrichCompanies,
  enrichContacts,
  enrichCorporateHierarchy,
  enrichIntent,
  enrichTechnographics,
  getUsage,
  lookupData,
  lookupFields,
  searchCompanies,
  searchContacts,
  searchIntent,
  searchNews,
  searchScoops,
  websightsLookup
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchContacts,
    searchCompanies,
    enrichContacts,
    enrichCompanies,
    searchIntent,
    enrichIntent,
    searchScoops,
    searchNews,
    websightsLookup,
    getUsage,
    enrichCorporateHierarchy,
    enrichTechnographics,
    complianceCheck,
    lookupData,
    lookupFields
  ],
  triggers: []
});
