import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelCampaign,
  createEmailMessage,
  deleteTag,
  getAccountInfo,
  getCampaignStats,
  getContact,
  getFieldsAndTags,
  getLists,
  getTemplates,
  importContacts,
  launchCampaign,
  listCampaigns,
  listMessages,
  manageFields,
  manageLists,
  manageTemplates,
  sendEmail,
  sendSms,
  subscribeContact,
  unsubscribeContact,
  updateEmailMessage,
  validateSender
} from './tools';
import { unisenderEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageLists,
    getLists,
    subscribeContact,
    unsubscribeContact,
    getContact,
    importContacts,
    createEmailMessage,
    updateEmailMessage,
    launchCampaign,
    cancelCampaign,
    getCampaignStats,
    listCampaigns,
    sendEmail,
    sendSms,
    manageTemplates,
    getTemplates,
    manageFields,
    getFieldsAndTags,
    deleteTag,
    listMessages,
    validateSender,
    getAccountInfo
  ],
  triggers: [unisenderEvents]
});
