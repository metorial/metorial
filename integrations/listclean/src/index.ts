import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadBulkResults,
  getAccount,
  getBulkListStatus,
  listBulkLists,
  uploadBulkList,
  verifyEmail
} from './tools';
import { emailDeliveryEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    verifyEmail,
    getAccount,
    uploadBulkList,
    getBulkListStatus,
    listBulkLists,
    downloadBulkResults
  ],
  triggers: [emailDeliveryEvents]
});
