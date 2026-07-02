import { Slate } from 'slates';
import { spec } from './spec';
import { getPromotionLeadsTool, getUserTool, listPromotionsTool } from './tools';
import { inboundWebhook, newLeadTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [getUserTool, listPromotionsTool, getPromotionLeadsTool],
  triggers: [inboundWebhook, newLeadTrigger]
});
