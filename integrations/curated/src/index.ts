import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDraftIssue,
  createLink,
  deleteDraftIssue,
  deleteLink,
  getIssue,
  getLink,
  getSubscriber,
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

export let provider = Slate.create({
  spec,
  tools: [
    listPublications,
    listIssues,
    getIssue,
    getLink,
    getSubscriber,
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
  triggers: []
});
