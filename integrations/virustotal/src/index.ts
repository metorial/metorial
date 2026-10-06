import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  addVote,
  getAnalysisStatus,
  getComments,
  getConnectionContext,
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
export let provider = Slate.create({
  spec,
  tools: [
    scanFile,
    scanUrl,
    getFileReport,
    getConnectionContext,
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
  triggers: []
});
