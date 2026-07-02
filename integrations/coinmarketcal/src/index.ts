import { Slate } from 'slates';
import { spec } from './spec';
import { listCategories, listCoins, searchEvents } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [searchEvents, listCoins, listCategories],
  triggers: [inboundWebhook]
});
