import { Slate } from 'slates';
import { spec } from './spec';
import {
  askQuestion,
  createBot,
  createSource,
  deleteBot,
  deleteConversation,
  deleteQuestion,
  deleteSource,
  getBot,
  getConversation,
  getUploadUrl,
  listBots,
  listConversations,
  listQuestions,
  listSources,
  listTeams,
  rateAnswer,
  recordEscalation,
  updateBot
} from './tools';
import { inboundWebhook, newConversations, newQuestions } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTeams,
    listBots,
    getBot,
    createBot,
    updateBot,
    deleteBot,
    listSources,
    createSource,
    deleteSource,
    getUploadUrl,
    askQuestion,
    rateAnswer,
    recordEscalation,
    listQuestions,
    deleteQuestion,
    listConversations,
    getConversation,
    deleteConversation
  ],
  triggers: [inboundWebhook, newQuestions, newConversations]
});
