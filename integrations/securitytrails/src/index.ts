import { Slate } from 'slates';
import { spec } from './spec';
import {
  discoverSubdomains,
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

import { inboundWebhook } from './triggers/inbound-webhook';

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
    getSslCertificates
  ],
  triggers: [inboundWebhook]
});
