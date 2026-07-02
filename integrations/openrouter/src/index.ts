import { Slate } from 'slates';
import { spec } from './spec';
import {
  createApiKey,
  createEmbedding,
  createGuardrail,
  deleteApiKey,
  deleteGuardrail,
  getCredits,
  getGenerationStats,
  getKeyInfo,
  getModel,
  listApiKeys,
  listGuardrails,
  listModels,
  sendChatCompletion,
  updateGuardrail
} from './tools';
import { creditBalanceChange, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendChatCompletion,
    createEmbedding,
    listModels,
    getModel,
    getGenerationStats,
    getCredits,
    getKeyInfo,
    listApiKeys,
    createApiKey,
    deleteApiKey,
    listGuardrails,
    createGuardrail,
    updateGuardrail,
    deleteGuardrail
  ],
  triggers: [inboundWebhook, creditBalanceChange]
});
