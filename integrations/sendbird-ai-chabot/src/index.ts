import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBot,
  deleteBot,
  generateAiReply,
  getBot,
  getMessage,
  listBotChannels,
  listBots,
  manageBotChannels,
  manageTypingIndicator,
  sendBotMessage,
  updateBot
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createBot,
    updateBot,
    listBots,
    getBot,
    getMessage,
    listBotChannels,
    deleteBot,
    sendBotMessage,
    generateAiReply,
    manageBotChannels,
    manageTypingIndicator
  ],
  triggers: []
});
