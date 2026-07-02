import { Slate } from 'slates';
import { spec } from './spec';
import { findLocations, getAccountInfo, healthCheck, listUsers } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [getAccountInfo, listUsers, findLocations, healthCheck],
  triggers: [inboundWebhook]
});
