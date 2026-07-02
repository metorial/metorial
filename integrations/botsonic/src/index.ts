import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBot,
  createFaq,
  createStarterQuestion,
  deleteBot,
  deleteFaq,
  deleteStarterQuestion,
  deleteTrainingData,
  endChat,
  generateResponse,
  getBot,
  getConversation,
  listBots,
  listConversations,
  listFaqs,
  listStarterQuestions,
  listTrainingData,
  updateStarterQuestion,
  uploadTrainingData
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generateResponse,
    listBots,
    getBot,
    createBot,
    deleteBot,
    uploadTrainingData,
    listTrainingData,
    deleteTrainingData,
    createFaq,
    listFaqs,
    deleteFaq,
    createStarterQuestion,
    updateStarterQuestion,
    listStarterQuestions,
    deleteStarterQuestion,
    listConversations,
    getConversation,
    endChat
  ],
  triggers: [inboundWebhook]
});
