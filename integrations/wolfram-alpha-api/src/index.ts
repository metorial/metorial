import { Slate } from 'slates';
import { spec } from './spec';
import {
  fullResultsQuery,
  llmQuery,
  shortAnswer,
  simpleImage,
  spokenResult,
  validateQuery
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [fullResultsQuery, shortAnswer, spokenResult, simpleImage, llmQuery, validateQuery],
  triggers: [inboundWebhook]
});
