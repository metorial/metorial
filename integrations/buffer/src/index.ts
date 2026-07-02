import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdateTool,
  deleteUpdateTool,
  editUpdateTool,
  getConfigurationTool,
  getInteractionsTool,
  getLinkSharesTool,
  getProfilesTool,
  getUpdatesTool,
  getUserTool,
  manageQueueTool,
  manageScheduleTool,
  shareUpdateTool
} from './tools';
import { inboundWebhook, newUpdateQueuedTrigger, newUpdateSentTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getUserTool,
    getProfilesTool,
    createUpdateTool,
    editUpdateTool,
    deleteUpdateTool,
    shareUpdateTool,
    getUpdatesTool,
    manageQueueTool,
    manageScheduleTool,
    getInteractionsTool,
    getLinkSharesTool,
    getConfigurationTool
  ],
  triggers: [inboundWebhook, newUpdateSentTrigger, newUpdateQueuedTrigger]
});
