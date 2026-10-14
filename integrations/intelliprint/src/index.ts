import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRecipient,
  cancelPrintJob,
  createBackground,
  createMailingList,
  createPrintJob,
  deleteBackground,
  deleteMailingList,
  deleteRecipient,
  downloadLetterPreview,
  getBackground,
  getFileUrl,
  getMailingList,
  getPrintJob,
  getRecipient,
  listBackgrounds,
  listMailingLists,
  listPrintJobs,
  listRecipients,
  updateBackground,
  updateMailingList,
  updatePrintJob,
  updateRecipient
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createBackground,
    updateBackground,
    downloadLetterPreview,
    getFileUrl,
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
  triggers: []
});
