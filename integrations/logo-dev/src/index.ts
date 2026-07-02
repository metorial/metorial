import { Slate } from 'slates';
import { spec } from './spec';
import { describeBrand, getLogoUrl, searchBrands } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [getLogoUrl, searchBrands, describeBrand],
  triggers: [inboundWebhook]
});
