import { Slate } from 'slates';
import { spec } from './spec';
import {
  createLink,
  deleteLinks,
  getClickAnalytics,
  getClickCounters,
  getLink,
  listDomains,
  listLinks,
  listWorkspaces,
  manageWebhooks,
  updateLink
} from './tools';
import { linkClicked } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createLink,
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
  triggers: [linkClicked]
});
