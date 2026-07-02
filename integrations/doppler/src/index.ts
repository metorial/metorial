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
import { secretChanged } from './triggers';

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
  triggers: [secretChanged]
});
