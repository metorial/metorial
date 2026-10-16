import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkUpdatePasses,
  copyTemplate,
  createPass,
  createTemplate,
  deletePass,
  deleteTemplate,
  deleteTemplateNotification,
  getPass,
  getPassStatistics,
  getProcess,
  getTemplate,
  getTemplateFields,
  listPasses,
  listTemplateNotifications,
  listTemplates,
  manageAppScan,
  manageBundle,
  publishTemplate,
  sendPass,
  sendPushNotification,
  updatePass,
  updateTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    copyTemplate,
    publishTemplate,
    createPass,
    getPass,
    listPasses,
    listTemplateNotifications,
    updatePass,
    deletePass,
    deleteTemplateNotification,
    bulkUpdatePasses,
    sendPass,
    sendPushNotification,
    manageBundle,
    getPassStatistics,
    getProcess,
    getTemplateFields,
    manageAppScan
  ],
  triggers: []
});
