import { Slate } from 'slates';
import { spec } from './spec';
import {
  appendMessages,
  chunkText,
  createMemory,
  createPipe,
  createThread,
  deleteDocument,
  deleteMemory,
  deleteThread,
  generateEmbeddings,
  generateImages,
  getThread,
  listDocuments,
  listMemories,
  listMessages,
  listPipes,
  retrieveMemory,
  retryDocumentEmbeddings,
  runAgent,
  runPipe,
  updatePipe,
  updateThread,
  webCrawl,
  webSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    createPipe,
    listPipes,
    updatePipe,
    runPipe,
    createMemory,
    listMemories,
    deleteMemory,
    retrieveMemory,
    listDocuments,
    deleteDocument,
    retryDocumentEmbeddings,
    createThread,
    getThread,
    updateThread,
    deleteThread,
    appendMessages,
    listMessages,
    runAgent,
    chunkText,
    generateEmbeddings,
    generateImages,
    webSearch,
    webCrawl
  ],
  triggers: [inboundWebhook]
});
