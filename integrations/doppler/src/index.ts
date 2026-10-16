import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  activityLogs,
  configLogs,
  downloadSecrets,
  exportSecrets,
  getCurrentToken,
  getWorkplace,
  listSecretNames,
  manageConfigs,
  manageEnvironments,
  manageProjects,
  manageSecrets,
  manageTrustedIps,
  manageWebhooks,
  shareSecret,
  updateSecretNote
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
    getWorkplace,
    getCurrentToken,
    listSecretNames,
    updateSecretNote,
    exportSecrets
  ],
  toolCategories: [
    toolCategory({
      key: 'secrets_manager',
      name: 'Doppler Secrets Manager',
      description:
        'Manage projects, configs, secrets, exports, change logs, webhooks, and trusted IPs.',
      tools: [
        manageSecrets,
        manageProjects,
        manageEnvironments,
        manageConfigs,
        downloadSecrets,
        exportSecrets,
        configLogs,
        activityLogs,
        manageWebhooks,
        manageTrustedIps,
        getWorkplace,
        listSecretNames,
        updateSecretNote
      ]
    }),
    toolCategory({
      key: 'share',
      name: 'Doppler Share',
      description: 'Share secret values using expiring links through the Doppler Share API.',
      tools: [shareSecret]
    })
  ],
  triggers: []
});
