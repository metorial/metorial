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
import { jobStatusChangedTrigger } from './triggers';

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
  triggers: [jobStatusChangedTrigger]
});
