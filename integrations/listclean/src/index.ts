import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadBulkResults,
  downloadListResults,
  getAccount,
  getBulkListStatus,
  getVerificationList,
  listBulkLists,
  listVerificationLists,
  uploadBulkList,
  verifyEmail,
  verifyEmailBatch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    verifyEmail,
    getAccount,
    uploadBulkList,
    getBulkListStatus,
    listBulkLists,
    downloadBulkResults,
    verifyEmailBatch,
    listVerificationLists,
    getVerificationList,
    downloadListResults
  ],
  triggers: []
});
