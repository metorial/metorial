import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRecipient,
  cancelPrintJob,
  createMailingList,
  createPrintJob,
  deleteBackground,
  deleteMailingList,
  deleteRecipient,
  getBackground,
  getMailingList,
  getPrintJob,
  getRecipient,
  listBackgrounds,
  listMailingLists,
  listPrintJobs,
  listRecipients,
  updateMailingList,
  updatePrintJob,
  updateRecipient
} from './tools';
import { letterUpdated, mailingListAddressesValidated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createPrintJob,
    getPrintJob,
    listPrintJobs,
    updatePrintJob,
    cancelPrintJob,
    listBackgrounds,
    getBackground,
    deleteBackground,
    createMailingList,
    getMailingList,
    listMailingLists,
    updateMailingList,
    deleteMailingList,
    addRecipient,
    getRecipient,
    listRecipients,
    updateRecipient,
    deleteRecipient
  ],
  triggers: [letterUpdated, mailingListAddressesValidated]
});
