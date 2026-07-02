import { Slate } from 'slates';
import { spec } from './spec';
import { checkUsage, detectGender, detectGenderBulk, validatePhone } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [detectGender, detectGenderBulk, validatePhone, checkUsage],
  triggers: [inboundWebhook]
});
