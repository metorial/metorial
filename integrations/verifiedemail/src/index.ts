import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkCredits,
  createEmailList,
  deleteEmailList,
  deleteWebhook,
  getListResults,
  listEmailLists,
  listWebhooks,
  manageWebhook,
  verifyEmail,
  verifyEmailList
} from './tools';
import { verificationEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    verifyEmail,
    checkCredits,
    listEmailLists,
    createEmailList,
    verifyEmailList,
    getListResults,
    deleteEmailList,
    manageWebhook,
    listWebhooks,
    deleteWebhook
  ],
  triggers: [verificationEvents]
});
