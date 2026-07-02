import { Slate } from 'slates';
import { spec } from './spec';
import { checkCreditBalance, fetchWebpage, webSearch } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [webSearch, fetchWebpage, checkCreditBalance],
  triggers: [inboundWebhook]
});
