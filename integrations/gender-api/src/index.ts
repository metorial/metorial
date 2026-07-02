import { Slate } from 'slates';
import { spec } from './spec';
import { accountStatistics, countryOfOrigin, detectGender } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [detectGender, countryOfOrigin, accountStatistics],
  triggers: [inboundWebhook]
});
