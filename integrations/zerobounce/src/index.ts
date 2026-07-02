import { Slate } from 'slates';
import { spec } from './spec';
import {
  findEmail,
  getAccountInfo,
  getActivityData,
  scoreEmail,
  validateEmail
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [validateEmail, scoreEmail, findEmail, getActivityData, getAccountInfo],
  triggers: [inboundWebhook]
});
