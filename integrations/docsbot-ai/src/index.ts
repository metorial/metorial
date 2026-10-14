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
  getSource,
  getTeam,
  getUploadUrl,
  listBots,
  listConversations,
  listQuestions,
  listSources,
  listTeams,
  manageSource,
  rateAnswer,
  recordEscalation,
  updateBot
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTeams,
    getTeam,
    listBots,
    getBot,
    createBot,
    updateBot,
    deleteBot,
    listSources,
    getSource,
    manageSource,
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
  triggers: []
});
