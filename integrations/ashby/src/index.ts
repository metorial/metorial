import { Slate } from 'slates';
import { spec } from './spec';
import {
  createApplicationTool,
  createCandidateTool,
  createJobTool,
  downloadFile,
  getCandidateTool,
  getCurrentApiKey,
  getFileUrl,
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
    setCustomField,
    getCurrentApiKey,
    downloadFile,
    getFileUrl
  ],
  triggers: []
});
