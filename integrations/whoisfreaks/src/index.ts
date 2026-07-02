import { Slate } from 'slates';
import { spec } from './spec';
import {
  dnsLookup,
  domainAvailability,
  domainDiscovery,
  domainWhoisLookup,
  historicalDnsLookup,
  historicalWhoisLookup,
  ipAsnWhoisLookup,
  ipGeolocation,
  reverseDnsLookup,
  reverseWhoisSearch,
  sslCertificateLookup,
  subdomainDiscovery
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    domainWhoisLookup,
    historicalWhoisLookup,
    reverseWhoisSearch,
    ipAsnWhoisLookup,
    dnsLookup,
    historicalDnsLookup,
    reverseDnsLookup,
    subdomainDiscovery,
    domainAvailability,
    domainDiscovery,
    sslCertificateLookup,
    ipGeolocation
  ],
  triggers: [inboundWebhook]
});
