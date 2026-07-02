import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCase,
  deleteDocument,
  getAccountInfo,
  getBankStatementAnalytics,
  getCaseOverview,
  getCaseTypeDetails,
  getDocument,
  getDocumentsSummary,
  getExtractedData,
  getReviewUrl,
  listAgents,
  listCases,
  listDocuments,
  listDocumentTypes,
  runCaseWorkflow,
  updateCase,
  updateReviewStatus,
  uploadDocument
} from './tools';
import { documentStatusChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccountInfo,
    listDocumentTypes,
    getDocumentsSummary,
    uploadDocument,
    listDocuments,
    getDocument,
    getExtractedData,
    getBankStatementAnalytics,
    deleteDocument,
    updateReviewStatus,
    getReviewUrl,
    listAgents,
    getCaseTypeDetails,
    listCases,
    getCaseOverview,
    createCase,
    updateCase,
    runCaseWorkflow
  ],
  triggers: [documentStatusChanged]
});
