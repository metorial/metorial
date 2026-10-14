import { Slate } from 'slates';
import { spec } from './spec';
import {
  confirmPoeTool,
  createJobTool,
  downloadJobResultsTool,
  getAccountInfoTool,
  getJobResultsTool,
  getJobStatusTool,
  manageJobTool,
  searchJobsTool,
  verifyEmailTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    verifyEmailTool,
    createJobTool,
    getJobStatusTool,
    getJobResultsTool,
    downloadJobResultsTool,
    searchJobsTool,
    manageJobTool,
    getAccountInfoTool,
    confirmPoeTool
  ],
  triggers: []
});
