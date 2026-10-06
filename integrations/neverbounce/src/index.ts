import { Slate } from 'slates';
import { spec } from './spec';
import {
  confirmPoeTool,
  createJobTool,
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
    searchJobsTool,
    manageJobTool,
    getAccountInfoTool,
    confirmPoeTool
  ],
  triggers: []
});
