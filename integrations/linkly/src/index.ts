import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkUpsertLinks,
  createLink,
  deleteLinks,
  exportClickAnalytics,
  getClickAnalytics,
  getClickCounters,
  getLink,
  listDomains,
  listLinks,
  listWorkspaces,
  manageWebhooks,
  updateLink
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    bulkUpsertLinks,
    createLink,
    exportClickAnalytics,
    updateLink,
    getLink,
    listLinks,
    deleteLinks,
    getClickAnalytics,
    getClickCounters,
    manageWebhooks,
    listWorkspaces,
    listDomains
  ],
  triggers: []
});
