import { Slate } from 'slates';
import { spec } from './spec';
import { createBanner, getAccount, getBanner, getUserAccess } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [createBanner, getBanner, getAccount, getUserAccess],
  triggers: [inboundWebhook]
});
