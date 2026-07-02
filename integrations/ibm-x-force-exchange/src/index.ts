import { Slate } from 'slates';
import { spec } from './spec';
import {
  getApiUsage,
  getThreatReport,
  lookupAppProfile,
  lookupDnsWhois,
  lookupIpReputation,
  lookupMalware,
  lookupUrlReputation,
  manageCollections,
  searchVulnerabilities
} from './tools';
import {
  inboundWebhook,
  newThreatReportsTrigger,
  newVulnerabilitiesTrigger
} from './triggers';

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
    getThreatReport,
    lookupAppProfile
  ],
  triggers: [inboundWebhook, newVulnerabilitiesTrigger, newThreatReportsTrigger]
});
