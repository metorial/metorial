import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocset,
  deleteDocset,
  deleteDocument,
  deleteProperties,
  extractProperties,
  generateQueryPlan,
  getDocset,
  getDocument,
  listDocsets,
  listDocuments,
  parseDocument,
  runQuery,
  searchDocuments,
  suggestProperties,
  updateDocset,
  updateDocumentProperties
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    parseDocument,
    listDocsets,
    getDocset,
    createDocset,
    updateDocset,
    deleteDocset,
    listDocuments,
    getDocument,
    deleteDocument,
    updateDocumentProperties,
    searchDocuments,
    extractProperties,
    deleteProperties,
    suggestProperties,
    runQuery,
    generateQueryPlan
  ],
  triggers: [inboundWebhook]
});
