import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkUpdatePasses,
  copyTemplate,
  createPass,
  createTemplate,
  deletePass,
  deleteTemplate,
  getPass,
  getPassStatistics,
  getTemplate,
  listPasses,
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
    updatePass,
    deletePass,
    bulkUpdatePasses,
    sendPass,
    sendPushNotification,
    manageBundle,
    getPassStatistics,
    manageAppScan
  ],
  triggers: []
});
