import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBulkSearch,
  findProfileUrl,
  getBulkSearchResults,
  getSearchResult,
  getSubscription,
  scanDomain,
  scrapeCompany,
  scrapeProfile,
  searchCompanies,
  searchEmail,
  searchLeads,
  verifyEmail
} from './tools';
import { bulkSearchEvent } from './triggers';

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
    getSubscription
  ],
  triggers: [bulkSearchEvent]
});
