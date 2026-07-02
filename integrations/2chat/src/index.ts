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
import {
  phoneCallTrigger,
  whatsappCallTrigger,
  whatsappConversationTrigger,
  whatsappGroupEventTrigger,
  whatsappMessageReceiptTrigger,
  whatsappMessageTrigger,
  whatsappNumberStatusTrigger,
  whatsappOrderTrigger
} from './triggers';

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
  triggers: [
    whatsappMessageTrigger,
    whatsappMessageReceiptTrigger,
    whatsappGroupEventTrigger,
    whatsappConversationTrigger,
    whatsappCallTrigger,
    whatsappNumberStatusTrigger,
    whatsappOrderTrigger,
    phoneCallTrigger
  ]
});
