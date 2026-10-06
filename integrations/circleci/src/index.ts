import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelJob,
  getFlakyTests,
  getInsights,
  getJob,
  getPipeline,
  getProject,
  getUser,
  getWorkflow,
  listPipelines,
  manageContextEnvVars,
  manageContexts,
  manageProjectEnvVars,
  manageSchedules,
  manageWebhooks,
  manageWorkflow,
  triggerPipeline,
  triggerPipelineRun
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    triggerPipelineRun,
    triggerPipeline,
    getPipeline,
    listPipelines,
    getWorkflow,
    manageWorkflow,
    getJob,
    cancelJob,
    getProject,
    manageProjectEnvVars,
    manageContexts,
    manageContextEnvVars,
    getInsights,
    getFlakyTests,
    manageSchedules,
    manageWebhooks,
    getUser
  ],
  triggers: []
});
