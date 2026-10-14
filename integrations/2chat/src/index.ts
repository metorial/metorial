import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkWhatsAppNumber,
  deleteWhatsAppMessage,
  getAccountInfo,
  getWhatsAppMessages,
  getWhatsAppNumber,
  listContacts,
  listWhatsAppGroups,
  listWhatsAppNumbers,
  manageContacts,
  manageWhatsAppGroup,
  sendGroupMessage,
  sendWhatsAppMessage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendWhatsAppMessage,
    sendGroupMessage,
    listWhatsAppNumbers,
    checkWhatsAppNumber,
    manageWhatsAppGroup,
    listWhatsAppGroups,
    getWhatsAppMessages,
    getAccountInfo,
    getWhatsAppNumber,
    listContacts,
    manageContacts,
    deleteWhatsAppMessage
  ],
  triggers: []
});
