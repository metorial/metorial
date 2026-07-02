import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAttributeTool,
  getAttributesTool,
  getAttributeValuesTool,
  getAveragesTool,
  getCorrelationsTool,
  getInsightsTool,
  getProfileTool,
  incrementAttributeValuesTool,
  manageAttributeOwnershipTool,
  updateAttributeValuesTool
} from './tools';
import { inboundWebhook, newInsightsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getProfileTool,
    getAttributesTool,
    getAttributeValuesTool,
    updateAttributeValuesTool,
    incrementAttributeValuesTool,
    manageAttributeOwnershipTool,
    createAttributeTool,
    getCorrelationsTool,
    getInsightsTool,
    getAveragesTool
  ],
  triggers: [inboundWebhook, newInsightsTrigger]
});
