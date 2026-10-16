import { toolCategory } from 'slates';
import { bulkIpGeolocation, domainWhois, hostedDomains, ipGeolocation } from './tools';

export let toolCategories = [
  toolCategory({
    key: 'ip_geolocation',
    name: 'IP2Location Geolocation',
    description: 'Single and bulk IP geolocation, network metadata, and proxy intelligence.',
    tools: [ipGeolocation, bulkIpGeolocation]
  }),
  toolCategory({
    key: 'domain_intelligence',
    name: 'IP2WHOIS Domain Intelligence',
    description: 'Domain WHOIS registration records and reverse IP hosted-domain lookups.',
    tools: [domainWhois, hostedDomains]
  })
];
