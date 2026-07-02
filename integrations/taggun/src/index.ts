import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMerchantKeyword,
  extractReceipt,
  manageCampaign,
  submitFeedback,
  validateReceipt
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [extractReceipt, validateReceipt, manageCampaign, submitFeedback, addMerchantKeyword],
  triggers: [inboundWebhook]
});
