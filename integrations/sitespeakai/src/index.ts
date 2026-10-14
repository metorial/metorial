import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdatedAnswer,
  deleteUpdatedAnswer,
  getAccount,
  getAnalytics,
  getChatbotSettings,
  getConversations,
  getLeads,
  getSources,
  getSuggestedMessages,
  listChatbots,
  listUpdatedAnswers,
  queryChatbot
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    queryChatbot,
    getChatbotSettings,
    getConversations,
    getLeads,
    listUpdatedAnswers,
    createUpdatedAnswer,
    deleteUpdatedAnswer,
    getSuggestedMessages,
    getSources,
    listChatbots,
    getAccount,
    getAnalytics
  ],
  triggers: []
});
