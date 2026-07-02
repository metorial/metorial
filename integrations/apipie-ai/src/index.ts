import { Slate } from 'slates';
import { spec } from './spec';
import {
  chatCompletion,
  createEmbeddings,
  discoverModels,
  generateImage,
  getUsage,
  manageRag,
  textToSpeech,
  webSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    chatCompletion,
    generateImage,
    textToSpeech,
    createEmbeddings,
    discoverModels,
    webSearch,
    manageRag,
    getUsage
  ],
  triggers: [inboundWebhook]
});
