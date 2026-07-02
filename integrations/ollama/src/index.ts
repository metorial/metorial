import { Slate } from 'slates';
import { spec } from './spec';
import {
  chat,
  copyModel,
  createModel,
  deleteModel,
  generateEmbeddings,
  generateText,
  listModels,
  pullModel,
  pushModel,
  showModel
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generateText,
    chat,
    generateEmbeddings,
    listModels,
    showModel,
    pullModel,
    pushModel,
    createModel,
    copyModel,
    deleteModel
  ],
  triggers: [inboundWebhook]
});
