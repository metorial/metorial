import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteAddress,
  autocompleteInternationalAddress,
  cancelOrder,
  createContact,
  createTemplate,
  getContact,
  getFileUrl,
  getOrder,
  listContacts,
  listOrders,
  listTemplates,
  sendCheque,
  sendLetter,
  sendPostcard,
  sendSelfMailer,
  updateTemplate,
  verifyAddress,
  verifyInternationalAddress
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    listContacts,
    sendLetter,
    sendPostcard,
    sendCheque,
    sendSelfMailer,
    getOrder,
    getContact,
    getFileUrl,
    listOrders,
    updateTemplate,
    cancelOrder,
    createTemplate,
    listTemplates,
    verifyAddress,
    verifyInternationalAddress,
    autocompleteAddress,
    autocompleteInternationalAddress
  ],
  triggers: []
});
