import { Slate } from 'slates';
import { spec } from './spec';
import {
  broadcastMessage,
  createUserAttribute,
  getBot,
  getUser,
  listBots,
  listCmsEntities,
  listCmsItems,
  manageBotAttributes,
  manageCmsEntity,
  manageCmsItem,
  publishBot,
  sendMessage,
  updateUser
} from './tools';
import { chatbotEvent, cmsEvent, userEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listBots,
    getBot,
    getUser,
    updateUser,
    createUserAttribute,
    broadcastMessage,
    sendMessage,
    listCmsEntities,
    manageCmsEntity,
    listCmsItems,
    manageCmsItem,
    manageBotAttributes,
    publishBot
  ],
  triggers: [userEvent, chatbotEvent, cmsEvent]
});
