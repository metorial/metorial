import { Slate } from 'slates';
import { spec } from './spec';
import { bulkIpGeolocation, domainWhois, hostedDomains, ipGeolocation } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [ipGeolocation, bulkIpGeolocation, domainWhois, hostedDomains],
  triggers: [inboundWebhook]
});
