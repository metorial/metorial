import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdateTool,
  deleteUpdateTool,
  editUpdateTool,
  getConfigurationTool,
  getInteractionsTool,
  getLinkSharesTool,
  getOrganizationsTool,
  getProfilesTool,
  getUpdatesTool,
  getUserTool,
  manageQueueTool,
  manageScheduleTool,
  shareUpdateTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getUserTool,
    getOrganizationsTool,
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
  triggers: []
});
