import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUpdatedAnswer,
  deleteUpdatedAnswer,
  getAccount,
  getChatbotSettings,
  getConversations,
  getLeads,
  getSources,
  getSuggestedMessages,
  listChatbots,
  listUpdatedAnswers,
  queryChatbot
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    getAccount
  ],
  triggers: [inboundWebhook]
});
