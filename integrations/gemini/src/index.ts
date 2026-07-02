import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  countTokens,
  createCachedContent,
  deleteCachedContent,
  deleteFile,
  generateEmbeddings,
  generateImage,
  generateText,
  getCachedContent,
  getFile,
  getModel,
  listCachedContents,
  listFiles,
  listModels,
  updateCachedContent,
  uploadFile
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generateText,
    generateEmbeddings,
    generateImage,
    listModels,
    getModel,
    countTokens,
    uploadFile,
    listFiles,
    getFile,
    deleteFile,
    createCachedContent,
    listCachedContents,
    getCachedContent,
    updateCachedContent,
    deleteCachedContent
  ],
  triggers: [inboundWebhook]
});
