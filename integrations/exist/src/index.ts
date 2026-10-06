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
  triggers: []
});
