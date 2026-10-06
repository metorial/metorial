import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNoteTool,
  createOpportunityTool,
  downloadFileTool,
  getOpportunityActivityTool,
  getOpportunityTool,
  getPipelineMetadataTool,
  getResourceTool,
  listOpportunitiesTool,
  listPostingsTool,
  listResourcesTool,
  listUsersTool,
  manageInterviewTool,
  managePostingTool,
  manageRequisitionTool,
  manageUserTool,
  updateContactTool,
  updateOpportunityTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getResourceTool,
    listResourcesTool,
    downloadFileTool,
    listOpportunitiesTool,
    getOpportunityTool,
    createOpportunityTool,
    updateOpportunityTool,
    listPostingsTool,
    managePostingTool,
    manageInterviewTool,
    addNoteTool,
    manageUserTool,
    listUsersTool,
    getPipelineMetadataTool,
    getOpportunityActivityTool,
    manageRequisitionTool,
    updateContactTool
  ],
  triggers: []
});
