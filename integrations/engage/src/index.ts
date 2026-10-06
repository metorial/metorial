import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrUpdateUser,
  deleteUser,
  getUser,
  listLists,
  listUsers,
  manageAccount,
  manageList,
  manageSubscription,
  mergeUsers,
  sendEmail,
  sendSms,
  trackEvent
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createOrUpdateUser,
    getUser,
    listUsers,
    deleteUser,
    mergeUsers,
    trackEvent,
    manageList,
    listLists,
    manageSubscription,
    sendEmail,
    sendSms,
    manageAccount
  ],
  triggers: []
});
