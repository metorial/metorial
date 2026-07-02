import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveLink,
  createLink,
  deleteLink,
  generateQrCode,
  getDomainStatistics,
  getLink,
  getLinkStatistics,
  listDomains,
  listLinks,
  updateLink
} from './tools';
import { inboundWebhook, newLink } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createLink,
    updateLink,
    deleteLink,
    getLink,
    listLinks,
    listDomains,
    getLinkStatistics,
    getDomainStatistics,
    generateQrCode,
    archiveLink
  ],
  triggers: [inboundWebhook, newLink]
});
