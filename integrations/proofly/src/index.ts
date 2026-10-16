import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConversion,
  getActivityLogs,
  getCampaignNotifications,
  getNotification,
  getNotificationData,
  getUserInfo,
  listCampaigns,
  toggleCampaign
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getUserInfo,
    getActivityLogs,
    listCampaigns,
    getCampaignNotifications,
    toggleCampaign,
    getNotificationData,
    getNotification,
    createConversion
  ],
  triggers: []
});
