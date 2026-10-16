import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import { bulkIpGeolocation, domainWhois, hostedDomains, ipGeolocation } from './tools';

export let provider = Slate.create({
  spec,
  toolCategories,
  tools: [ipGeolocation, bulkIpGeolocation, domainWhois, hostedDomains],
  triggers: []
});
