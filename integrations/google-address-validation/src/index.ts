import { Slate } from 'slates';
import { spec } from './spec';
import { provideValidationFeedback, validateAddress } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [validateAddress, provideValidationFeedback],
  triggers: [inboundWebhook]
});
