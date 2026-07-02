import { Slate } from 'slates';
import { spec } from './spec';
import {
  agentCompletion,
  chatCompletion,
  createAsyncChatCompletion,
  generateContextualizedEmbeddings,
  generateEmbeddings,
  getAsyncChatCompletion,
  listAgentModels,
  listAsyncChatCompletions,
  webSearch
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    chatCompletion,
    createAsyncChatCompletion,
    getAsyncChatCompletion,
    listAsyncChatCompletions,
    webSearch,
    agentCompletion,
    listAgentModels,
    generateEmbeddings,
    generateContextualizedEmbeddings
  ],
  triggers: []
});
