import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInbox,
  deleteDraft,
  deleteInbox,
  deleteThread,
  forwardEmail,
  getAttachment,
  getInbox,
  getMessage,
  getThread,
  listDomains,
  listDrafts,
  listInboxes,
  listListEntries,
  listMessages,
  listPods,
  listThreads,
  manageDomain,
  manageDraft,
  manageListEntry,
  managePod,
  manageWebhook,
  replyToEmail,
  sendEmail,
  updateInbox,
  updateMessageLabels
} from './tools';
import { domainEvents, messageEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createInbox,
    listInboxes,
    getInbox,
    updateInbox,
    deleteInbox,
    sendEmail,
    replyToEmail,
    forwardEmail,
    listMessages,
    getMessage,
    updateMessageLabels,
    listThreads,
    getThread,
    deleteThread,
    manageDraft,
    listDrafts,
    deleteDraft,
    getAttachment,
    manageDomain,
    listDomains,
    managePod,
    listPods,
    manageListEntry,
    listListEntries,
    manageWebhook
  ],
  triggers: [messageEvents, domainEvents]
});
