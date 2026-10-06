import { Slate } from 'slates';
import { spec } from './spec';
import { getImpactTool, purchaseCarbonOffsetsTool, purchaseTreesTool } from './tools';

export let provider = Slate.create({
  spec,
  tools: [purchaseTreesTool, purchaseCarbonOffsetsTool, getImpactTool],
  triggers: []
});
