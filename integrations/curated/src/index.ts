import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDraftIssue,
  createLink,
  deleteDraftIssue,
  deleteLink,
  getIssue,
  listCategories,
  listIssues,
  listLinks,
  listPublications,
  listSubscribers,
  listUnsubscribers,
  subscribeEmail,
  unsubscribeEmail,
  updateLink
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listPublications,
    listIssues,
    getIssue,
    createDraftIssue,
    deleteDraftIssue,
    listLinks,
    createLink,
    updateLink,
    deleteLink,
    listSubscribers,
    subscribeEmail,
    unsubscribeEmail,
    listUnsubscribers,
    listCategories
  ],
  triggers: [inboundWebhook]
});
