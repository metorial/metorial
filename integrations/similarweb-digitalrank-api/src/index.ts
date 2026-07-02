import { Slate } from 'slates';
import { spec } from './spec';
import { getRemainingCredits, getTopWebsites, getWebsiteRank } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [getWebsiteRank, getTopWebsites, getRemainingCredits],
  triggers: [inboundWebhook]
});
