import { Slate } from 'slates';
import { spec } from './spec';
import { domainUtilities, hostedDomains, whoisLookup } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [whoisLookup, hostedDomains, domainUtilities],
  triggers: [inboundWebhook]
});
