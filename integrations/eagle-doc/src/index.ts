import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkBatchTask,
  checkUsage,
  extractSignatures,
  processAnyDocument,
  processFinanceDocument,
  splitDocument,
  submitBatch,
  submitFeedback
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    processFinanceDocument,
    processAnyDocument,
    extractSignatures,
    splitDocument,
    submitBatch,
    checkBatchTask,
    submitFeedback,
    checkUsage
  ],
  triggers: [inboundWebhook]
});
