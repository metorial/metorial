import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBulkSearch,
  findProfileUrl,
  getBulkSearchResults,
  getSearchResult,
  getSubscription,
  listBulkSearches,
  reverseEmailLookup,
  scanDomain,
  scrapeCompany,
  scrapeProfile,
  searchCompanies,
  searchEmail,
  searchLeads,
  verifyEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchEmail,
    verifyEmail,
    scanDomain,
    getSearchResult,
    createBulkSearch,
    getBulkSearchResults,
    scrapeProfile,
    scrapeCompany,
    findProfileUrl,
    searchLeads,
    searchCompanies,
    getSubscription,
    reverseEmailLookup,
    listBulkSearches
  ],
  triggers: []
});
