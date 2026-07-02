import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  addVote,
  getAnalysisStatus,
  getComments,
  getDomainReport,
  getFileReport,
  getIpReport,
  getRelationships,
  getUrlReport,
  manageLivehuntRuleset,
  manageRetrohunt,
  scanFile,
  scanUrl,
  searchIntelligence
} from './tools';
import { inboundWebhook, iocStream } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    scanFile,
    scanUrl,
    getFileReport,
    getUrlReport,
    getDomainReport,
    getIpReport,
    getAnalysisStatus,
    addComment,
    getComments,
    addVote,
    getRelationships,
    searchIntelligence,
    manageLivehuntRuleset,
    manageRetrohunt
  ],
  triggers: [inboundWebhook, iocStream]
});
