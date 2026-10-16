import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveLink,
  createFolder,
  createLink,
  createLinksBulk,
  deleteLink,
  findLinksByOriginalUrl,
  generateQrCode,
  getDomain,
  getDomainStatistics,
  getLink,
  getLinkPreview,
  getLinkStatistics,
  listDomains,
  listFolders,
  listLinks,
  updateLink,
  updateLinkPreview
} from './tools';
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
    archiveLink,
    createFolder,
    createLinksBulk,
    findLinksByOriginalUrl,
    getDomain,
    getLinkPreview,
    listFolders,
    updateLinkPreview
  ],
  triggers: []
});
