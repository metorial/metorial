import { Slate } from 'slates';
import { spec } from './spec';
import {
  continueDomainSearch,
  discoverSubdomains,
  getAccountUsage,
  getAssociatedDomains,
  getDnsHistory,
  getDomainInfo,
  getDomainTags,
  getIpDetails,
  getSslCertificates,
  getWhois,
  getWhoisHistory,
  searchDomains,
  searchIps
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getDomainInfo,
    discoverSubdomains,
    getWhois,
    getDnsHistory,
    getWhoisHistory,
    getAssociatedDomains,
    searchDomains,
    searchIps,
    getIpDetails,
    getDomainTags,
    getSslCertificates,
    getAccountUsage,
    continueDomainSearch
  ],
  triggers: []
});
