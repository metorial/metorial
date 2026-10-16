import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteLink,
  generateQrCode,
  getClickAnalytics,
  getLink,
  listDomains,
  listLinks,
  listWorkspaces,
  shortenUrl
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    shortenUrl,
    deleteLink,
    listDomains,
    generateQrCode,
    listWorkspaces,
    getLink,
    listLinks,
    getClickAnalytics
  ],
  triggers: []
});
