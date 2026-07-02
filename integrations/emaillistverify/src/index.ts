import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkBulkStatus,
  domainSearch,
  enrichEmail,
  findEmail,
  uploadBulkFile,
  verifyEmail
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [verifyEmail, enrichEmail, findEmail, domainSearch, uploadBulkFile, checkBulkStatus],
  triggers: [inboundWebhook]
});
