import { Slate } from 'slates';
import { spec } from './spec';
import { generateImageSetsTool, getAccountStatusTool, optimizeImageTool } from './tools';
import { optimizationCompletedTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [optimizeImageTool, generateImageSetsTool, getAccountStatusTool],
  triggers: [optimizationCompletedTrigger]
});
