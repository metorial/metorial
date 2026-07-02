import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTemplate,
  deleteMedia,
  deleteTemplate,
  getBusinessProfile,
  getMediaUrl,
  getPhoneNumber,
  listPhoneNumbers,
  listTemplates,
  markMessageRead,
  registerPhoneNumber,
  sendInteractiveMessage,
  sendMessage,
  sendTemplateMessage,
  updateBusinessProfile
} from './tools';
import { messageReceived, messageStatus } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    sendInteractiveMessage,
    sendTemplateMessage,
    listTemplates,
    createTemplate,
    deleteTemplate,
    getMediaUrl,
    deleteMedia,
    getBusinessProfile,
    updateBusinessProfile,
    listPhoneNumbers,
    getPhoneNumber,
    registerPhoneNumber,
    markMessageRead
  ],
  triggers: [messageReceived, messageStatus]
});
