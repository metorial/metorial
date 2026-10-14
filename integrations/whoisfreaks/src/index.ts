import { Slate } from 'slates';
import { spec } from './spec';
import {
  dnsLookup,
  domainAvailability,
  domainDiscovery,
  domainReputationLookup,
  domainWhoisLookup,
  getApiUsage,
  historicalDnsLookup,
  historicalWhoisLookup,
  ipAsnWhoisLookup,
  ipGeolocation,
  ipReputationLookup,
  reverseDnsLookup,
  reverseWhoisSearch,
  sslCertificateLookup,
  subdomainDiscovery
} from './tools';

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
    ipGeolocation,
    getApiUsage,
    ipReputationLookup,
    domainReputationLookup
  ],
  triggers: []
});
