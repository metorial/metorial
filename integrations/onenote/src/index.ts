import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyContent,
  createNotebook,
  createPage,
  createSection,
  createSectionGroup,
  deletePage,
  getNotebook,
  getPage,
  listNotebooks,
  listPages,
  listSectionGroups,
  listSections,
  searchPages,
  updatePageContent
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listNotebooks,
    getNotebook,
    createNotebook,
    listSections,
    createSection,
    listSectionGroups,
    createSectionGroup,
    listPages,
    getPage,
    createPage,
    updatePageContent,
    deletePage,
    searchPages,
    copyContent
  ],
  triggers: [inboundWebhook]
});
