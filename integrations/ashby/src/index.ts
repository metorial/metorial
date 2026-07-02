import { Slate } from 'slates';
import { spec } from './spec';
import {
  createApplicationTool,
  createCandidateTool,
  createJobTool,
  getCandidateTool,
  listApplicationsTool,
  listJobsTool,
  listOrganizationTool,
  manageInterviewScheduleTool,
  manageOfferTool,
  setCustomField,
  updateApplicationTool,
  updateCandidateTool,
  updateJob
} from './tools';
import {
  applicationEventsTrigger,
  candidateEventsTrigger,
  interviewEventsTrigger,
  jobEventsTrigger,
  offerEventsTrigger,
  openingEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createCandidateTool,
    getCandidateTool,
    updateCandidateTool,
    createApplicationTool,
    updateApplicationTool,
    listApplicationsTool,
    listJobsTool,
    createJobTool,
    updateJob,
    manageOfferTool,
    manageInterviewScheduleTool,
    listOrganizationTool,
    setCustomField
  ],
  triggers: [
    candidateEventsTrigger,
    applicationEventsTrigger,
    jobEventsTrigger,
    offerEventsTrigger,
    interviewEventsTrigger,
    openingEventsTrigger
  ]
});
