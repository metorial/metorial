import { Slate } from 'slates';
import { spec } from './spec';
import { createBatchVerification, getBatchVerificationStatus, verifyEmail } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [verifyEmail, createBatchVerification, getBatchVerificationStatus],
  triggers: [inboundWebhook]
});
