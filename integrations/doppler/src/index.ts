import { Slate } from 'slates';
import { spec } from './spec';
import {
  activityLogs,
  configLogs,
  downloadSecrets,
  getWorkplace,
  manageConfigs,
  manageEnvironments,
  manageProjects,
  manageSecrets,
  manageTrustedIps,
  manageWebhooks,
  shareSecret
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageSecrets,
    manageProjects,
    manageEnvironments,
    manageConfigs,
    downloadSecrets,
    configLogs,
    activityLogs,
    shareSecret,
    manageWebhooks,
    manageTrustedIps,
    getWorkplace
  ],
  triggers: []
});
