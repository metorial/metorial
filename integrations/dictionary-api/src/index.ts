import { Slate } from 'slates';
import { spec } from './spec';
import { getPhonetics, getSynonymsAntonyms, lookUpWord } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [lookUpWord, getSynonymsAntonyms, getPhonetics],
  triggers: [inboundWebhook]
});
