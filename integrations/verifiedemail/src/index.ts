import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkCredits,
  createEmailList,
  deleteEmailList,
  deleteWebhook,
  getEmailList,
  getListResults,
  getResultsDownload,
  listEmailLists,
  listWebhooks,
  manageWebhook,
  requestResultsDownload,
  verifyEmail,
  verifyEmailList
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    verifyEmail,
    checkCredits,
    listEmailLists,
    createEmailList,
    verifyEmailList,
    getEmailList,
    getListResults,
    getResultsDownload,
    deleteEmailList,
    manageWebhook,
    requestResultsDownload,
    listWebhooks,
    deleteWebhook
  ],
  triggers: []
});
