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
  triggerPipeline
} from './tools';
import { buildEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [buildEvent]
});
