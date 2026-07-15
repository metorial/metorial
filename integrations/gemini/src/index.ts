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
  generateVideo,
  getCachedContent,
  getFile,
  getModel,
  getVideoOperation,
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
    generateVideo,
    getVideoOperation,
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
