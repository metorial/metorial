import { Slate } from 'slates';
import { spec } from './spec';
import { getPromotionLeadsTool, getUserTool, listPromotionsTool } from './tools';
export let provider = Slate.create({
  spec,
  tools: [getUserTool, listPromotionsTool, getPromotionLeadsTool],
  triggers: []
});
