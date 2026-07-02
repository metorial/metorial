import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNoteTool,
  createOpportunityTool,
  getOpportunityActivityTool,
  getOpportunityTool,
  getPipelineMetadataTool,
  listOpportunitiesTool,
  listPostingsTool,
  listUsersTool,
  manageInterviewTool,
  managePostingTool,
  manageRequisitionTool,
  manageUserTool,
  updateContactTool,
  updateOpportunityTool
} from './tools';
import {
  contactEventsTrigger,
  interviewEventsTrigger,
  opportunityEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [opportunityEventsTrigger, interviewEventsTrigger, contactEventsTrigger]
});
