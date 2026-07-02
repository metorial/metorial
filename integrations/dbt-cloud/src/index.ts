import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelRunTool,
  getAccountTool,
  getEnvironmentTool,
  getJobTool,
  getProjectTool,
  getRunArtifactTool,
  getRunFailureDetailsTool,
  getRunTool,
  getWebhookTool,
  listAccountsTool,
  listEnvironmentsTool,
  listJobsTool,
  listProjectsTool,
  listRunArtifactsTool,
  listRunsTool,
  listUsersTool,
  listWebhookEventsTool,
  listWebhooksTool,
  manageWebhookTool,
  retryFailedJobTool,
  retryRunTool,
  testWebhookTool,
  triggerJobRunTool
} from './tools';
import { jobRunEventTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAccountsTool,
    getAccountTool,
    listProjectsTool,
    getProjectTool,
    listEnvironmentsTool,
    getEnvironmentTool,
    listJobsTool,
    getJobTool,
    triggerJobRunTool,
    retryFailedJobTool,
    listRunsTool,
    getRunTool,
    cancelRunTool,
    getRunFailureDetailsTool,
    retryRunTool,
    listRunArtifactsTool,
    getRunArtifactTool,
    listUsersTool,
    listWebhooksTool,
    getWebhookTool,
    listWebhookEventsTool,
    testWebhookTool,
    manageWebhookTool
  ],
  triggers: [jobRunEventTrigger]
});
