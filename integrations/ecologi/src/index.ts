import { Slate } from 'slates';
import { spec } from './spec';
import { getImpactTool, purchaseCarbonOffsetsTool, purchaseTreesTool } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [purchaseTreesTool, purchaseCarbonOffsetsTool, getImpactTool],
  triggers: [inboundWebhook]
});
