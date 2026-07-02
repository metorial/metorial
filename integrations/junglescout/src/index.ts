import { Slate } from 'slates';
import { spec } from './spec';
import {
  historicalSearchVolumeTool,
  keywordsByAsinTool,
  keywordsByKeywordTool,
  productDatabaseTool,
  salesEstimatesTool,
  shareOfVoiceTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    keywordsByAsinTool,
    keywordsByKeywordTool,
    historicalSearchVolumeTool,
    productDatabaseTool,
    salesEstimatesTool,
    shareOfVoiceTool
  ],
  triggers: [inboundWebhook]
});
