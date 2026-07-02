import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelNotification,
  createApp,
  createSegment,
  createSubscription,
  createTemplate,
  createUser,
  deleteSegment,
  deleteSubscription,
  deleteTemplate,
  deleteUser,
  exportData,
  getApp,
  getTemplate,
  getUser,
  listApps,
  listSegments,
  listTemplates,
  sendNotification,
  transferSubscription,
  updateApp,
  updateSubscription,
  updateTemplate,
  updateUser,
  viewNotifications
} from './tools';
import { notificationEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendNotification,
    viewNotifications,
    cancelNotification,
    createUser,
    getUser,
    updateUser,
    deleteUser,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    transferSubscription,
    createSegment,
    listSegments,
    deleteSegment,
    createTemplate,
    listTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    listApps,
    getApp,
    createApp,
    updateApp,
    exportData
  ],
  triggers: [notificationEvents]
});
