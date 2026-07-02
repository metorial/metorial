import { Slate } from 'slates';
import { spec } from './spec';
import { findEmail, lookupLinkedInProfile } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [lookupLinkedInProfile, findEmail],
  triggers: [inboundWebhook]
});
