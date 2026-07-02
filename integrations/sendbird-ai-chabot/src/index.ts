import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBot,
  deleteBot,
  generateAiReply,
  getBot,
  listBots,
  manageBotChannels,
  manageTypingIndicator,
  sendBotMessage,
  updateBot
} from './tools';
import { channelEvents, messageEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createBot,
    updateBot,
    listBots,
    getBot,
    deleteBot,
    sendBotMessage,
    generateAiReply,
    manageBotChannels,
    manageTypingIndicator
  ],
  triggers: [messageEvents, channelEvents]
});
