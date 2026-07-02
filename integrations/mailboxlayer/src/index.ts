import { Slate } from 'slates';
import { spec } from './spec';
import { bulkValidateEmails, validateEmail } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [validateEmail, bulkValidateEmails],
  triggers: [inboundWebhook]
});
