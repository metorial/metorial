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
  searchCompanies,
  searchContacts,
  searchIntent,
  searchNews,
  searchScoops,
  websightsLookup
} from './tools';
import { recordUpdated } from './triggers';

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
    complianceCheck
  ],
  triggers: [recordUpdated]
});
