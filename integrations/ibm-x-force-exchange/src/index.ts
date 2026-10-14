import { Slate } from 'slates';
import { spec } from './spec';
import {
  getApiUsage,
  getCurrentUser,
  getThreatReport,
  lookupAppProfile,
  lookupDnsWhois,
  lookupIpReputation,
  lookupMalware,
  lookupUrlReputation,
  manageCollections,
  searchVulnerabilities
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    lookupIpReputation,
    lookupUrlReputation,
    lookupMalware,
    searchVulnerabilities,
    lookupDnsWhois,
    manageCollections,
    getApiUsage,
    getCurrentUser,
    getThreatReport,
    lookupAppProfile
  ],
  triggers: []
});
