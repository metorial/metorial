import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkWhatsAppNumber,
  deleteWhatsAppMessage,
  getWhatsAppMessages,
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
    manageContacts,
    deleteWhatsAppMessage
  ],
  triggers: []
});
